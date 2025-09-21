import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings2, Globe, DollarSign, Calculator, Bot } from "lucide-react";
import type { Settings } from "@shared/schema";

export default function SettingsPage() {
  const { t, setLanguage } = useTranslation();
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    select: (data: Settings) => data
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<Settings>) => {
      if (!settings?.id) throw new Error('No settings ID');
      const response = await apiRequest('PUT', `/api/settings/${settings.id}`, updatedSettings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: t('toast.uploadSuccess'),
        description: t('settings.updateSuccess'),
      });
    },
    onError: () => {
      toast({
        title: t('toast.uploadFailed'),
        description: t('settings.updateFailed'),
        variant: "destructive",
      });
    }
  });

  const handleUpdateSettings = (field: keyof Settings, value: string | boolean) => {
    if (!settings) return;
    
    // If language is being changed, update i18n context immediately
    if (field === 'language' && typeof value === 'string') {
      setLanguage(value);
    }
    
    const updatedSettings = {
      ...settings,
      [field]: value
    };
    
    updateSettingsMutation.mutate(updatedSettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('settings.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="settings-page-title">
          {t('nav.settings')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="settings-page-description">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Language & Localization */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('settings.language.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">{t('settings.language.label')}</Label>
            <Select
              value={settings.language}
              onValueChange={(value) => handleUpdateSettings('language', value)}
            >
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tr" data-testid="option-language-tr">
                  Türkçe (TR)
                </SelectItem>
                <SelectItem value="en" data-testid="option-language-en">
                  English (EN)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('settings.currency.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">{t('settings.currency.primary')}</Label>
            <Select
              value={settings.currency}
              onValueChange={(value) => handleUpdateSettings('currency', value)}
            >
              <SelectTrigger data-testid="select-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD" data-testid="option-currency-usd">
                  USD ($)
                </SelectItem>
                <SelectItem value="EUR" data-testid="option-currency-eur">
                  EUR (€)
                </SelectItem>
                <SelectItem value="TRY" data-testid="option-currency-try">
                  TRY (₺)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eurRate">{t('settings.currency.eurRate')}</Label>
              <Input
                id="eurRate"
                type="number"
                step="0.0001"
                value={settings.eurToUsdRate || ''}
                onChange={(e) => handleUpdateSettings('eurToUsdRate', e.target.value)}
                data-testid="input-eur-rate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tryRate">{t('settings.currency.tryRate')}</Label>
              <Input
                id="tryRate"
                type="number"
                step="0.0001"
                value={settings.tryToUsdRate || ''}
                onChange={(e) => handleUpdateSettings('tryToUsdRate', e.target.value)}
                data-testid="input-try-rate"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Calculation Parameters */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t('settings.cost.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="materialMultiplier">{t('settings.cost.materialMultiplier')}</Label>
              <Input
                id="materialMultiplier"
                type="number"
                step="0.001"
                value={settings.materialCostMultiplier || ''}
                onChange={(e) => handleUpdateSettings('materialCostMultiplier', e.target.value)}
                data-testid="input-material-multiplier"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="laborMultiplier">{t('settings.cost.laborMultiplier')}</Label>
              <Input
                id="laborMultiplier"
                type="number"
                step="0.001"
                value={settings.laborCostMultiplier || ''}
                onChange={(e) => handleUpdateSettings('laborCostMultiplier', e.target.value)}
                data-testid="input-labor-multiplier"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overheadMultiplier">{t('settings.cost.overheadMultiplier')}</Label>
              <Input
                id="overheadMultiplier"
                type="number"
                step="0.001"
                value={settings.overheadCostMultiplier || ''}
                onChange={(e) => handleUpdateSettings('overheadCostMultiplier', e.target.value)}
                data-testid="input-overhead-multiplier"
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="steelPrice">{t('settings.cost.steelPrice')}</Label>
              <Input
                id="steelPrice"
                type="number"
                step="0.01"
                value={settings.steelPricePerKg || ''}
                onChange={(e) => handleUpdateSettings('steelPricePerKg', e.target.value)}
                data-testid="input-steel-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="laborRate">{t('settings.cost.laborRate')}</Label>
              <Input
                id="laborRate"
                type="number"
                step="0.01"
                value={settings.hourlyLaborRate || ''}
                onChange={(e) => handleUpdateSettings('hourlyLaborRate', e.target.value)}
                data-testid="input-labor-rate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overheadPercent">{t('settings.cost.overheadPercent')}</Label>
              <Input
                id="overheadPercent"
                type="number"
                step="0.01"
                value={settings.overheadPercentage || ''}
                onChange={(e) => handleUpdateSettings('overheadPercentage', e.target.value)}
                data-testid="input-overhead-percent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Settings */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t('settings.ai.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoAnalysis">{t('settings.ai.autoAnalysis')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.ai.autoAnalysisDescription')}
              </p>
            </div>
            <Switch
              id="autoAnalysis"
              checked={settings.autoAnalysisEnabled || false}
              onCheckedChange={(checked) => handleUpdateSettings('autoAnalysisEnabled', checked)}
              data-testid="switch-auto-analysis"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confidenceThreshold">{t('settings.ai.confidenceThreshold')}</Label>
            <Input
              id="confidenceThreshold"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={settings.analysisConfidenceThreshold || ''}
              onChange={(e) => handleUpdateSettings('analysisConfidenceThreshold', e.target.value)}
              data-testid="input-confidence-threshold"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.ai.confidenceDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}