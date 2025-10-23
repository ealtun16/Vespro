"""
Vespro AI Agent - Tank Cost Analysis Assistant
Bu agent, yüklenmiş sipariş verilerini kullanarak kullanıcılara
fiyat teklifi ve sipariş analizi yapar.
"""

import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Vespro AI Agent", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Database connection
def get_db_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(
        os.getenv("DATABASE_URL"),
        cursor_factory=RealDictCursor
    )


class ChatMessage(BaseModel):
    """Chat message model"""
    session_id: Optional[str] = None
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    """Chat response model"""
    success: bool
    reply: str
    data: Optional[Dict[str, Any]] = None
    tokens: Optional[int] = None
    error: Optional[str] = None


class OrderAnalysisRequest(BaseModel):
    """Order analysis request model"""
    tank_specifications: Dict[str, Any]
    quantity: Optional[int] = 1


class PriceEstimate(BaseModel):
    """Price estimate model"""
    material_cost: float
    labor_cost: float
    overhead_cost: float
    total_cost: float
    currency: str = "EUR"
    breakdown: Dict[str, Any]


class AgentContext:
    """Agent context manager for retrieving relevant data"""
    
    def __init__(self):
        self.conn = None
    
    def __enter__(self):
        self.conn = get_db_connection()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            self.conn.close()
    
    def get_recent_orders(self, limit: int = 10) -> List[Dict]:
        """Get recent tank orders"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    id,
                    order_code,
                    customer_name,
                    project_code,
                    tank_name,
                    diameter_mm,
                    length_mm,
                    volume,
                    material_grade,
                    quantity,
                    total_price_eur,
                    total_weight_kg,
                    labor_eur,
                    outsource_eur,
                    created_date
                FROM tank_order
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))
            return cur.fetchall()
    
    def get_order_details(self, order_id: int) -> Dict:
        """Get detailed order information including cost items"""
        with self.conn.cursor() as cur:
            # Get order header
            cur.execute("""
                SELECT * FROM tank_order WHERE id = %s
            """, (order_id,))
            order = cur.fetchone()
            
            if not order:
                return None
            
            # Get cost items
            cur.execute("""
                SELECT 
                    ci.*,
                    mq.name as material_quality_name,
                    mt.name as material_type_name,
                    uu.code as unit_code
                FROM cost_item ci
                LEFT JOIN material_quality mq ON ci.material_quality_id = mq.id
                LEFT JOIN material_type mt ON ci.material_type_id = mt.id
                LEFT JOIN uom_unit uu ON ci.unit_id = uu.id
                WHERE ci.order_id = %s
                ORDER BY ci.group_no, ci.line_no
            """, (order_id,))
            cost_items = cur.fetchall()
            
            return {
                "order": dict(order),
                "cost_items": [dict(item) for item in cost_items]
            }
    
    def search_similar_orders(self, specifications: Dict[str, Any]) -> List[Dict]:
        """Search for similar orders based on specifications"""
        with self.conn.cursor() as cur:
            # Simple similarity search based on diameter and volume
            diameter = specifications.get("diameter_mm", 0)
            volume = specifications.get("volume", 0)
            
            cur.execute("""
                SELECT 
                    id,
                    order_code,
                    customer_name,
                    diameter_mm,
                    volume,
                    material_grade,
                    total_price_eur,
                    total_weight_kg
                FROM tank_order
                WHERE 
                    diameter_mm BETWEEN %s AND %s
                    AND volume BETWEEN %s AND %s
                ORDER BY created_at DESC
                LIMIT 5
            """, (
                diameter * 0.9, diameter * 1.1,
                volume * 0.9, volume * 1.1
            ))
            return cur.fetchall()
    
    def get_material_prices(self) -> Dict[str, float]:
        """Get average material prices from recent orders"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    mt.name as material_type,
                    AVG(ci.unit_price_eur) as avg_price,
                    uu.code as unit
                FROM cost_item ci
                LEFT JOIN material_type mt ON ci.material_type_id = mt.id
                LEFT JOIN uom_unit uu ON ci.unit_id = uu.id
                WHERE ci.unit_price_eur > 0
                GROUP BY mt.name, uu.code
            """)
            results = cur.fetchall()
            return {
                f"{row['material_type']}_{row['unit']}": float(row['avg_price'])
                for row in results if row['material_type']
            }
    
    def get_labor_rates(self) -> Dict[str, float]:
        """Get current labor rates"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    lr.role_name,
                    lrate.day_rate_eur
                FROM labor_rate lrate
                JOIN labor_role lr ON lrate.role_id = lr.id
                WHERE lrate.valid_from <= CURRENT_DATE
                    AND (lrate.valid_to IS NULL OR lrate.valid_to >= CURRENT_DATE)
            """)
            results = cur.fetchall()
            return {row['role_name']: float(row['day_rate_eur']) for row in results}


class VesproAgent:
    """Main AI agent for tank cost analysis"""
    
    def __init__(self):
        self.model = "gpt-4o-mini"
        self.default_labor_rate = float(os.getenv("DEFAULT_LABOR_RATE_EUR", "25.0"))
        self.default_overhead = float(os.getenv("DEFAULT_OVERHEAD_PERCENTAGE", "15.0"))
        self.material_markup = float(os.getenv("DEFAULT_MATERIAL_MARKUP", "1.2"))
    
    def build_system_prompt(self, context_data: Dict[str, Any]) -> str:
        """Build system prompt with context"""
        return f"""Sen Vespro tank üretim şirketinin maliyet analiz uzmanısın. 
Müşterilere tank siparişleri için fiyat teklifi ve maliyet analizi yapıyorsun.

Mevcut Veriler:
- Son sipariş sayısı: {len(context_data.get('recent_orders', []))}
- Ortalama malzeme fiyatları: {json.dumps(context_data.get('material_prices', {}), indent=2)}
- İşçilik ücretleri: {json.dumps(context_data.get('labor_rates', {}), indent=2)}

Görevin:
1. Müşteri sorularını yanıtla
2. Tank spesifikasyonlarına göre fiyat tahmini yap
3. Benzer geçmiş siparişleri referans göster
4. Maliyet kırılımını detaylı açıkla

Yanıtlarını Türkçe ver ve profesyonel ol. Fiyatları EUR cinsinden belirt.
"""
    
    def estimate_price(self, specifications: Dict[str, Any]) -> PriceEstimate:
        """Estimate price based on tank specifications"""
        
        # Extract specifications
        diameter = float(specifications.get("diameter_mm", 0))
        length = float(specifications.get("length_mm", 0))
        volume = float(specifications.get("volume", 0))
        material_grade = specifications.get("material_grade", "standard")
        quantity = int(specifications.get("quantity", 1))
        
        # Calculate surface area (simplified cylinder)
        surface_area = (3.14159 * diameter * length) / 1_000_000  # m²
        
        # Estimate material weight (simplified)
        # Assuming 5mm thickness, steel density 7850 kg/m³
        thickness_m = 0.005
        material_weight = surface_area * thickness_m * 7850  # kg
        
        # Material cost calculation
        base_material_price_per_kg = 3.5  # EUR per kg
        material_multiplier = 1.0
        
        if "duplex" in material_grade.lower():
            material_multiplier = 2.5
        elif "stainless" in material_grade.lower():
            material_multiplier = 2.0
        
        material_cost = material_weight * base_material_price_per_kg * material_multiplier * self.material_markup
        
        # Labor cost estimation (based on tank size)
        base_labor_hours = 20 + (volume / 10)  # More volume = more work
        labor_cost = base_labor_hours * self.default_labor_rate
        
        # Overhead cost
        overhead_cost = (material_cost + labor_cost) * (self.default_overhead / 100)
        
        # Total per unit
        unit_total = material_cost + labor_cost + overhead_cost
        
        # Total for quantity
        total_cost = unit_total * quantity
        
        breakdown = {
            "surface_area_m2": round(surface_area, 2),
            "estimated_weight_kg": round(material_weight, 2),
            "material_price_per_kg": round(base_material_price_per_kg * material_multiplier, 2),
            "labor_hours": round(base_labor_hours, 2),
            "labor_rate_per_hour": self.default_labor_rate,
            "overhead_percentage": self.default_overhead,
            "unit_price": round(unit_total, 2),
            "quantity": quantity
        }
        
        return PriceEstimate(
            material_cost=round(material_cost * quantity, 2),
            labor_cost=round(labor_cost * quantity, 2),
            overhead_cost=round(overhead_cost * quantity, 2),
            total_cost=round(total_cost, 2),
            breakdown=breakdown
        )
    
    def chat(self, message: str, context: Optional[Dict[str, Any]] = None) -> ChatResponse:
        """Process chat message with AI"""
        
        try:
            # Get context data from database
            with AgentContext() as agent_context:
                context_data = {
                    "recent_orders": agent_context.get_recent_orders(5),
                    "material_prices": agent_context.get_material_prices(),
                    "labor_rates": agent_context.get_labor_rates()
                }
                
                # Check if user is asking for a price estimate
                is_price_request = any(keyword in message.lower() for keyword in 
                                      ["fiyat", "teklif", "ne kadar", "maliyet", "price", "cost", "quote"])
                
                # Build messages for OpenAI
                messages = [
                    {"role": "system", "content": self.build_system_prompt(context_data)},
                    {"role": "user", "content": message}
                ]
                
                # Add recent orders context if available
                if context_data["recent_orders"]:
                    orders_summary = "\n".join([
                        f"- {order['order_code']}: {order['customer_name']}, "
                        f"Çap: {order['diameter_mm']}mm, "
                        f"Hacim: {order['volume']}m³, "
                        f"Fiyat: {order['total_price_eur']} EUR"
                        for order in context_data["recent_orders"][:3]
                    ])
                    messages[0]["content"] += f"\n\nSon Siparişler:\n{orders_summary}"
                
                # Call OpenAI
                response = openai_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1000
                )
                
                reply = response.choices[0].message.content
                tokens_used = response.usage.total_tokens
                
                # Extract price estimate if requested
                price_estimate = None
                if is_price_request and context and "specifications" in context:
                    price_estimate = self.estimate_price(context["specifications"])
                
                return ChatResponse(
                    success=True,
                    reply=reply,
                    data={
                        "price_estimate": price_estimate.dict() if price_estimate else None,
                        "context_used": {
                            "recent_orders_count": len(context_data["recent_orders"]),
                            "material_types_count": len(context_data["material_prices"])
                        }
                    },
                    tokens=tokens_used
                )
                
        except Exception as e:
            return ChatResponse(
                success=False,
                reply="Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
                error=str(e)
            )
    
    def analyze_order(self, specifications: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze order and provide detailed cost breakdown"""
        
        try:
            with AgentContext() as agent_context:
                # Get similar orders
                similar_orders = agent_context.search_similar_orders(specifications)
                
                # Estimate price
                price_estimate = self.estimate_price(specifications)
                
                # Generate AI analysis
                analysis_prompt = f"""
Aşağıdaki tank spesifikasyonları için detaylı bir maliyet analizi yap:

Spesifikasyonlar:
{json.dumps(specifications, indent=2, ensure_ascii=False)}

Tahmini Fiyat:
{json.dumps(price_estimate.dict(), indent=2, ensure_ascii=False)}

Benzer Geçmiş Siparişler ({len(similar_orders)} adet bulundu):
{json.dumps([dict(o) for o in similar_orders], indent=2, ensure_ascii=False)}

Lütfen şunları içeren bir analiz yap:
1. Fiyat tahmininin mantığı
2. Benzer siparişlerle karşılaştırma
3. Optimizasyon önerileri
4. Risk faktörleri
"""
                
                response = openai_client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "Sen bir tank maliyet analiz uzmanısın."},
                        {"role": "user", "content": analysis_prompt}
                    ],
                    temperature=0.5,
                    max_tokens=1500
                )
                
                analysis = response.choices[0].message.content
                
                return {
                    "success": True,
                    "price_estimate": price_estimate.dict(),
                    "similar_orders": [dict(o) for o in similar_orders],
                    "analysis": analysis,
                    "tokens": response.usage.total_tokens
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Initialize agent
agent = VesproAgent()


# API Endpoints
@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "service": "Vespro AI Agent",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatMessage):
    """Chat endpoint for conversational interaction"""
    return agent.chat(request.message, request.context)


@app.post("/analyze", response_model=Dict[str, Any])
def analyze_endpoint(request: OrderAnalysisRequest):
    """Analyze order and provide cost estimate"""
    return agent.analyze_order(request.tank_specifications)


@app.get("/context/recent-orders")
def get_recent_orders():
    """Get recent orders for context"""
    try:
        with AgentContext() as context:
            orders = context.get_recent_orders(10)
            return {
                "success": True,
                "orders": [dict(o) for o in orders]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/context/material-prices")
def get_material_prices():
    """Get current material prices"""
    try:
        with AgentContext() as context:
            prices = context.get_material_prices()
            return {
                "success": True,
                "prices": prices
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("AGENT_PORT", "8001"))
    host = os.getenv("AGENT_HOST", "0.0.0.0")
    
    print(f"🚀 Starting Vespro AI Agent on {host}:{port}")
    
    uvicorn.run(
        "agent:app",
        host=host,
        port=port,
        reload=True
    )
