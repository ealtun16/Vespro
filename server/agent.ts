interface N8NAgentConfig {
  chatEndpoint: string; // Full webhook URL for chat
  analyzeEndpoint: string; // Full webhook URL for analysis
  apiKey?: string;
  apiKeyHeader?: string; // Default: 'X-N8N-API-KEY', can be 'Authorization' for Bearer
  timeout?: number;
  maxRetries?: number;
}

interface AgentChatRequest {
  sessionId?: string;
  message: string;
  context?: {
    latestForm?: any;
    recentRecords?: any[];
    customContext?: Record<string, any>;
  };
}

interface AgentAnalyzeRequest {
  formData: any;
  preliminaryPrice: number;
  priceBreakdown?: any;
}

interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  agentRunId?: string;
  tokens?: number;
}

class N8NAgentService {
  private config: N8NAgentConfig;

  constructor(config: N8NAgentConfig) {
    this.config = {
      timeout: 30000, // 30 second default timeout
      maxRetries: 3,
      apiKeyHeader: 'X-N8N-API-KEY', // n8n standard header
      ...config
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter: base * 2^attempt + random jitter
    const base = 1000; // 1 second base
    const exponential = base * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // 0-1 second jitter
    return Math.min(exponential + jitter, 10000); // max 10 seconds
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 0
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      // Retry on 5xx errors or 429 (rate limit)
      if (response.status >= 500 || response.status === 429) {
        if (attempt < this.config.maxRetries!) {
          const backoff = this.calculateBackoff(attempt);
          console.log(`[Agent] Retrying request after ${backoff}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
          await this.sleep(backoff);
          return this.fetchWithRetry(url, options, attempt + 1);
        }
      }

      return response;
    } catch (error: any) {
      // Handle timeout and network errors
      if (error.name === 'AbortError') {
        if (attempt < this.config.maxRetries!) {
          const backoff = this.calculateBackoff(attempt);
          console.log(`[Agent] Request timeout, retrying after ${backoff}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
          await this.sleep(backoff);
          return this.fetchWithRetry(url, options, attempt + 1);
        }
        throw new Error('Request timeout after retries');
      }

      if (attempt < this.config.maxRetries!) {
        const backoff = this.calculateBackoff(attempt);
        console.log(`[Agent] Network error, retrying after ${backoff}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
        await this.sleep(backoff);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async chat(request: AgentChatRequest): Promise<AgentResponse> {
    try {
      if (!this.config.chatEndpoint) {
        throw new Error('n8n chat endpoint not configured');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey && this.config.apiKeyHeader) {
        if (this.config.apiKeyHeader === 'Authorization') {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        } else {
          headers[this.config.apiKeyHeader] = this.config.apiKey;
        }
      }

      const response = await this.fetchWithRetry(
        this.config.chatEndpoint,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sessionId: request.sessionId,
            message: request.message,
            context: request.context,
            timestamp: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        let errorBody = '';
        try {
          const errorData = await response.json();
          errorBody = JSON.stringify(errorData);
        } catch {
          errorBody = await response.text();
        }
        console.error('[Agent] Chat request failed:', response.status, errorBody);
        throw new Error(`Agent request failed: ${response.status} ${response.statusText} - ${errorBody.substring(0, 200)}`);
      }

      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        const text = await response.text();
        console.error('[Agent] Failed to parse JSON response:', text);
        throw new Error('Invalid JSON response from agent');
      }

      return {
        success: true,
        data: data.reply || data.message || data,
        agentRunId: data.runId || data.executionId,
        tokens: data.tokens || data.usage?.total_tokens
      };
    } catch (error: any) {
      console.error('[Agent] Chat error:', error);
      return {
        success: false,
        error: error.message || 'Failed to communicate with agent'
      };
    }
  }

  async analyze(request: AgentAnalyzeRequest): Promise<AgentResponse> {
    try {
      if (!this.config.analyzeEndpoint) {
        throw new Error('n8n analyze endpoint not configured');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey && this.config.apiKeyHeader) {
        if (this.config.apiKeyHeader === 'Authorization') {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        } else {
          headers[this.config.apiKeyHeader] = this.config.apiKey;
        }
      }

      const response = await this.fetchWithRetry(
        this.config.analyzeEndpoint,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            formData: request.formData,
            preliminaryPrice: request.preliminaryPrice,
            priceBreakdown: request.priceBreakdown,
            timestamp: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        let errorBody = '';
        try {
          const errorData = await response.json();
          errorBody = JSON.stringify(errorData);
        } catch {
          errorBody = await response.text();
        }
        console.error('[Agent] Analysis request failed:', response.status, errorBody);
        throw new Error(`Agent analysis failed: ${response.status} ${response.statusText} - ${errorBody.substring(0, 200)}`);
      }

      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        const text = await response.text();
        console.error('[Agent] Failed to parse JSON response:', text);
        throw new Error('Invalid JSON response from agent');
      }

      return {
        success: true,
        data: data.analysis || data.result || data,
        agentRunId: data.runId || data.executionId,
        tokens: data.tokens || data.usage?.total_tokens
      };
    } catch (error: any) {
      console.error('[Agent] Analysis error:', error);
      return {
        success: false,
        error: error.message || 'Failed to analyze with agent'
      };
    }
  }
}

// Export factory function to create agent with config from settings
export function createAgent(config: N8NAgentConfig): N8NAgentService {
  return new N8NAgentService(config);
}

export type { N8NAgentConfig, AgentChatRequest, AgentAnalyzeRequest, AgentResponse };
