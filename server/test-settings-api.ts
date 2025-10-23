async function testSettingsAPI() {
  try {
    console.log("Testing Settings API...\n");
    
    // Test 1: Get settings
    console.log("1. GET /api/settings");
    const response = await fetch("http://localhost:5000/api/settings");
    const settings = await response.json();
    
    console.log("Status:", response.status);
    console.log("Settings:", JSON.stringify(settings, null, 2));
    
    if (!settings || !settings.id) {
      console.error("❌ Settings not found or invalid!");
    } else {
      console.log("✓ Settings retrieved successfully");
      console.log("  - ID:", settings.id);
      console.log("  - Language:", settings.language);
      console.log("  - Currency:", settings.currency);
      console.log("  - EUR/USD Rate:", settings.eurToUsdRate);
      console.log("  - USD/TRY Rate:", settings.usdToTryRate);
    }
    
  } catch (error) {
    console.error("Error testing settings API:", error);
  }
}

testSettingsAPI();
