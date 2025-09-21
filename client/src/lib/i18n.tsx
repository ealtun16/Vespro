import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Translations dictionary by locale
const translations = {
  tr: {
  // Navigation
  'nav.dashboard': 'Gösterge Paneli',
  'nav.import': 'Veri İçe Aktarma',
  'nav.tankSpecs': 'Tank Özellikleri',
  'nav.costAnalysis': 'Maliyet Analizi',
  'nav.reports': 'Raporlar',
  'nav.settings': 'Ayarlar',

  // Dashboard
  'dashboard.title': 'Gösterge Paneli',
  'dashboard.subtitle': 'Tank maliyet analizi sistemine genel bakış',
  'dashboard.stats.totalReports': 'Toplam Rapor',
  'dashboard.stats.tankModels': 'Tank Modeli',
  'dashboard.stats.avgCost': 'Ortalama Maliyet',
  'dashboard.stats.monthlyReports': 'Aylık Rapor',
  'dashboard.recentAnalyses': 'Son Analizler',
  'dashboard.costDistribution': 'Maliyet Dağılımı',
  'dashboard.viewAll': 'Tümünü Gör',

  // Import Page
  'import.title': 'Veri İçe Aktarma',
  'import.subtitle': 'Tank maliyet analizi verilerini içeren Excel dosyalarını içe aktarın',
  'import.uploadTitle': 'Excel Maliyet Analizi Yükle',
  'import.uploadDescription': 'Excel dosyalarınızı buraya sürükleyin veya göz atmak için tıklayın',
  'import.chooseFiles': 'Dosya Seç',
  'import.bulkImport': 'Toplu İçe Aktarma',
  'import.supportedFormats': 'Desteklenen formatlar: .xlsx, .xls (Maks 10MB)',
  'import.uploading': 'Yükleniyor...',
  'import.guidelines': 'İçe Aktarma Kuralları',
  'import.importedRecords': 'İçe Aktarılan Kayıtlar',
  'import.loadingRecords': 'Kayıtlar yükleniyor...',
  'import.noRecords': 'Henüz kayıt yok',
  'import.startByUploading': 'Excel dosyası yükleyerek başlayın',
  'import.processedCount': '{{count}} kayıt işlendi',
  'import.uploadSuccess': 'Yükleme başarılı',
  'import.uploadSuccessDescription': 'Dosya başarıyla yüklendi ve işlendi',
  'import.guidelinesTitle': 'İçe Aktarma Kuralları',
  'import.requiredColumns': 'Gerekli Excel Sütunları:',
  'import.optionalColumns': 'İsteğe Bağlı Sütunlar:',
  'import.fileRequirements': 'Dosya Gereksinimleri:',

  // Activity Messages
  'activity.reportUploaded': 'Yeni maliyet analizi raporu yüklendi: {{id}}',
  'activity.tankUpdated': 'Tank özellikleri güncellendi: {{name}}',
  'activity.excelExported': 'Excel dışa aktarma tamamlandı: {{filename}}',
  'activity.backupCompleted': 'Sistem yedekleme başarıyla tamamlandı',
  'activity.recentActivity': 'Son Aktiviteler',

  // Time
  'time.hoursAgo': '{{count}} saat önce',
  'time.hourAgo': '1 saat önce',

  // Table Headers  
  'table.formTitle': 'Form Başlığı',
  'table.tankName': 'Tank Adı',
  'table.tankType': 'Tank Tipi',
  'table.currency': 'Para Birimi',
  'table.importDate': 'İçe Aktarma Tarihi',
  'table.actions': 'İşlemler',
  'table.reportId': 'Rapor ID',
  'table.analysisDate': 'Analiz Tarihi',
  'table.totalCost': 'Toplam Maliyet',
  'table.capacity': 'Kapasite',
  'table.material': 'Malzeme',

  // Actions
  'action.view': 'Görüntüle',
  'action.edit': 'Düzenle',
  'action.delete': 'Sil',
  'action.export': 'Dışa Aktar',
  'action.analyze': 'Analiz Et',
  'action.download': 'İndir',
  'action.print': 'Yazdır',
  'action.backToList': 'Listeye Dön',

  // Cost Analysis Page
  'costAnalysis.title': 'Maliyet Analizi',
  'costAnalysis.subtitle': 'Tank projeleri için maliyet analizi raporlarını görüntüleyin ve yönetin',
  'costAnalysis.detailTitle': 'Maliyet Analizi Detayları',
  'costAnalysis.detailSubtitle': 'Kapsamlı maliyet analizi raporu',
  'costAnalysis.searchPlaceholder': 'Rapor ID veya tank adına göre ara...',
  'costAnalysis.filterByTankType': 'Tank Tipine Göre Filtrele',
  'costAnalysis.allTankTypes': 'Tüm Tank Tipleri',
  'costAnalysis.noResults': 'Sonuç bulunamadı',
  'costAnalysis.noResultsDescription': 'Arama kriterlerinizi değiştirmeyi deneyin',
  'costAnalysis.exportSuccess': 'Dışa aktarma başarılı',
  'costAnalysis.exportSuccessDescription': 'Maliyet analizi verileri Excel\'e aktarıldı',
  'costAnalysis.exportFailed': 'Dışa aktarma başarısız',
  'costAnalysis.exportFailedDescription': 'Excel\'e aktarma işlemi başarısız oldu',

  // Cost Breakdown
  'costBreakdown.title': 'Maliyet Dağılımı',
  'costBreakdown.materialCost': 'Malzeme Maliyeti',
  'costBreakdown.laborCost': 'İşçilik Maliyeti',
  'costBreakdown.overheadCost': 'Genel Giderler',
  'costBreakdown.totalCost': 'Toplam Maliyet',
  'costBreakdown.currency': 'Para Birimi',
  'costBreakdown.percentage': 'Yüzde',
  'costBreakdown.amount': 'Tutar',

  // Tank Information
  'tankInfo.title': 'Tank Bilgileri',
  'tankInfo.name': 'Tank Adı',
  'tankInfo.type': 'Tank Tipi',
  'tankInfo.capacity': 'Kapasite',
  'tankInfo.dimensions': 'Boyutlar',
  'tankInfo.height': 'Yükseklik',
  'tankInfo.diameter': 'Çap',
  'tankInfo.width': 'Genişlik',
  'tankInfo.material': 'Malzeme',
  'tankInfo.pressure': 'Basınç',
  'tankInfo.temperature': 'Sıcaklık',

  // Analysis Information
  'analysisInfo.title': 'Analiz Bilgileri',
  'analysisInfo.reportId': 'Rapor ID',
  'analysisInfo.analysisDate': 'Analiz Tarihi',
  'analysisInfo.createdDate': 'Oluşturulma Tarihi',
  'analysisInfo.lastUpdated': 'Son Güncelleme',
  'analysisInfo.notes': 'Notlar',
  'analysisInfo.autoGenerated': 'Otomatik oluşturuldu',
  'analysisInfo.manuallyCreated': 'Manuel oluşturuldu',

  // Auto Analysis
  'autoAnalysis.title': 'Otomatik Analiz',
  'autoAnalysis.triggered': 'Otomatik analiz tetiklendi',
  'autoAnalysis.source': 'Kaynak',
  'autoAnalysis.excelImport': 'Excel İçe Aktarma',
  'autoAnalysis.manualEntry': 'Manuel Giriş',
  'autoAnalysis.settings': 'Ayarlar',
  'autoAnalysis.enabled': 'Etkin',
  'autoAnalysis.disabled': 'Devre Dışı',

  // Status & Messages
  'status.loading': 'Yükleniyor...',
  'status.noData': 'Veri bulunamadı',
  'status.error': 'Hata oluştu',
  'status.success': 'Başarılı',
  'status.failed': 'Başarısız',
  'status.unspecified': 'Belirtilmemiş',

  // Toasts
  'toast.uploadSuccess': 'Dosya başarıyla yüklendi',
  'toast.uploadFailed': 'Yükleme başarısız',
  'toast.invalidFileType': 'Geçersiz dosya türü',
  'toast.invalidFileDescription': 'Lütfen Excel dosyası (.xlsx veya .xls) yükleyin',
  'toast.uploadFailedDescription': 'Excel dosyası yükleme ve işleme başarısız oldu',
  'toast.fileTooLarge': 'Dosya çok büyük',
  'toast.featureComingSoon': 'Özellik yakında geliyor',
  'toast.featureComingSoonDescription': 'Toplu içe aktarma özelliği yakında kullanılabilir olacak',

  // Cost Analysis
  'cost.materialCost': 'Malzeme Maliyeti',
  'cost.laborCost': 'İşçilik Maliyeti', 
  'cost.overheadCost': 'Genel Gider',
  'cost.totalCost': 'Toplam Maliyet',

  // Tank Types
  'tankType.storageTank': 'Depolama Tankı',
  'tankType.pressureVessel': 'Basınç Kabı',
  'tankType.heatExchanger': 'Isı Değiştiricisi',

  // Common
  'common.search': 'Ara',
  'common.filter': 'Filtrele',
  'common.sort': 'Sırala',
  'common.date': 'Tarih',
  'common.name': 'Ad',
  'common.type': 'Tip',
  'common.description': 'Açıklama',
  'common.notes': 'Notlar',
  'common.cancel': 'İptal',
  'common.save': 'Kaydet',
  'common.close': 'Kapat',

  // Settings Page
  'settings.subtitle': 'Sistem ayarlarını yönetin ve maliyet analizi parametrelerini yapılandırın',
  'settings.updateSuccess': 'Ayarlar başarıyla güncellendi',
  'settings.updateFailed': 'Ayarlar güncellenemedi',
  'settings.notFound': 'Ayarlar bulunamadı',
  
  // Language Settings
  'settings.language.title': 'Dil ve Yerelleştirme',
  'settings.language.label': 'Arayüz Dili',
  
  // Currency Settings
  'settings.currency.title': 'Para Birimi Ayarları',
  'settings.currency.primary': 'Ana Para Birimi',
  'settings.currency.eurRate': 'EUR/USD Kuru',
  'settings.currency.tryRate': 'TRY/USD Kuru',
  
  // Cost Calculation Settings
  'settings.cost.title': 'Maliyet Hesaplama Parametreleri',
  'settings.cost.materialMultiplier': 'Malzeme Maliyet Çarpanı',
  'settings.cost.laborMultiplier': 'İşçilik Maliyet Çarpanı',
  'settings.cost.overheadMultiplier': 'Genel Gider Çarpanı',
  'settings.cost.steelPrice': 'Çelik Fiyatı (USD/kg)',
  'settings.cost.laborRate': 'Saatlik İşçilik Ücreti (USD)',
  'settings.cost.overheadPercent': 'Genel Gider Yüzdesi (%)',
  
  // AI Analysis Settings
  'settings.ai.title': 'Yapay Zeka Analiz Ayarları',
  'settings.ai.autoAnalysis': 'Otomatik Analiz',
  'settings.ai.autoAnalysisDescription': 'Yeni kayıtlar için otomatik maliyet analizi yapılsın',
  'settings.ai.confidenceThreshold': 'Güven Eşiği',
  'settings.ai.confidenceDescription': 'Analiz sonuçları için minimum güven seviyesi (0-1 arası)',
  
  // Import Guidelines - Required Columns
  'import.guideline.reportId': 'Rapor ID - Maliyet analizi için benzersiz tanımlayıcı',
  'import.guideline.tankType': 'Tank Tipi - Depolama Tankı, Basınç Kabı veya Isı Değiştiricisi',
  'import.guideline.tankName': 'Tank Adı - Tank için açıklayıcı ad',
  'import.guideline.capacity': 'Kapasite - Tank kapasitesi litre cinsinden',
  'import.guideline.height': 'Yükseklik - Tank yüksekliği milimetre cinsinden',
  'import.guideline.materialCost': 'Malzeme Maliyeti - USD cinsinden malzeme maliyeti',
  'import.guideline.laborCost': 'İşçilik Maliyeti - USD cinsinden işçilik maliyetleri',
  'import.guideline.overheadCost': 'Genel Gider - USD cinsinden genel gider maliyetleri',
  'import.guideline.totalCost': 'Toplam Maliyet - USD cinsinden toplam proje maliyeti',
  
  // Import Guidelines - Optional Columns  
  'import.guideline.material': 'Malzeme - Çelik kalitesi veya malzeme türü',
  'import.guideline.thickness': 'Kalınlık - Duvar kalınlığı milimetre cinsinden',
  'import.guideline.pressure': 'Basınç - Çalışma basıncı bar cinsinden',
  'import.guideline.temperature': 'Sıcaklık - Çalışma sıcaklığı Celsius cinsinden',
  
  // Import Guidelines - File Requirements
  'import.guideline.maxFileSize': 'Maksimum dosya boyutu: 10MB',
  'import.guideline.supportedFormats': 'Desteklenen formatlar: .xlsx, .xls',
  'import.guideline.dataStartRow': 'Veriler 2. satırdan başlamalı (başlıklar için 1. satır)',
  'import.guideline.requiredColumnsPresent': 'Tüm gerekli sütunlar bulunmalı',
  
  // Logout
  'action.logout': 'Oturum Kapat'
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.import': 'Import Data',
    'nav.tankSpecs': 'Tank Specifications',
    'nav.costAnalysis': 'Cost Analysis',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Overview of tank cost analysis system',
    'dashboard.stats.totalReports': 'Total Reports',
    'dashboard.stats.tankModels': 'Tank Models',
    'dashboard.stats.avgCost': 'Average Cost',
    'dashboard.stats.monthlyReports': 'Monthly Reports',
    'dashboard.recentAnalyses': 'Recent Analyses',
    'dashboard.costDistribution': 'Cost Distribution',
    'dashboard.viewAll': 'View All',

    // Import Page
    'import.title': 'Import Data',
    'import.subtitle': 'Import Excel files containing tank cost analysis data',
    'import.uploadTitle': 'Upload Excel Cost Analysis',
    'import.uploadDescription': 'Select multiple Excel files to upload at once',
    'import.chooseFiles': 'Choose Files',
    'import.bulkImport': 'Bulk Import',
    'import.supportedFormats': 'Supported formats: .xlsx, .xls (Max 10MB)',
    'import.uploading': 'Uploading...',
    'import.guidelines': 'Import Guidelines',
    'import.importedRecords': 'Imported Records',
    'import.loadingRecords': 'Loading records...',
    'import.noRecords': 'No records yet',
    'import.startByUploading': 'Start by uploading an Excel file',
    'import.processedCount': '{{count}} records processed',
    'import.uploadSuccess': 'Upload successful',
    'import.uploadSuccessDescription': 'File uploaded and processed successfully',
    'import.guidelinesTitle': 'Import Guidelines',
    'import.requiredColumns': 'Required Excel Columns:',
    'import.optionalColumns': 'Optional Columns:',
    'import.fileRequirements': 'File Requirements:',

    // Activity Messages
    'activity.reportUploaded': 'New cost analysis report uploaded: {{id}}',
    'activity.tankUpdated': 'Tank specifications updated: {{name}}',
    'activity.excelExported': 'Excel export completed: {{filename}}',
    'activity.backupCompleted': 'System backup completed successfully',
    'activity.recentActivity': 'Recent Activity',

    // Time
    'time.hoursAgo': '{{count}} hours ago',
    'time.hourAgo': '1 hour ago',

    // Table Headers  
    'table.formTitle': 'Form Title',
    'table.tankName': 'Tank Name',
    'table.tankType': 'Tank Type',
    'table.currency': 'Currency',
    'table.importDate': 'Import Date',
    'table.actions': 'Actions',
    'table.reportId': 'Report ID',
    'table.analysisDate': 'Analysis Date',
    'table.totalCost': 'Total Cost',
    'table.capacity': 'Capacity',
    'table.material': 'Material',

    // Actions
    'action.view': 'View',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.export': 'Export',
    'action.analyze': 'Analyze',
    'action.download': 'Download',
    'action.print': 'Print',
    'action.backToList': 'Back to List',

    // Cost Analysis Page
    'costAnalysis.title': 'Cost Analysis',
    'costAnalysis.subtitle': 'View and manage cost analysis reports for tank projects',
    'costAnalysis.detailTitle': 'Cost Analysis Details',
    'costAnalysis.detailSubtitle': 'Comprehensive cost analysis report',
    'costAnalysis.searchPlaceholder': 'Search by report ID or tank name...',
    'costAnalysis.filterByTankType': 'Filter by Tank Type',
    'costAnalysis.allTankTypes': 'All Tank Types',
    'costAnalysis.noResults': 'No results found',
    'costAnalysis.noResultsDescription': 'Try changing your search criteria',
    'costAnalysis.exportSuccess': 'Export successful',
    'costAnalysis.exportSuccessDescription': 'Cost analysis data exported to Excel',
    'costAnalysis.exportFailed': 'Export failed',
    'costAnalysis.exportFailedDescription': 'Failed to export to Excel',

    // Cost Breakdown
    'costBreakdown.title': 'Cost Breakdown',
    'costBreakdown.materialCost': 'Material Cost',
    'costBreakdown.laborCost': 'Labor Cost',
    'costBreakdown.overheadCost': 'Overhead Cost',
    'costBreakdown.totalCost': 'Total Cost',
    'costBreakdown.currency': 'Currency',
    'costBreakdown.percentage': 'Percentage',
    'costBreakdown.amount': 'Amount',

    // Tank Information
    'tankInfo.title': 'Tank Information',
    'tankInfo.name': 'Tank Name',
    'tankInfo.type': 'Tank Type',
    'tankInfo.capacity': 'Capacity',
    'tankInfo.dimensions': 'Dimensions',
    'tankInfo.height': 'Height',
    'tankInfo.diameter': 'Diameter',
    'tankInfo.width': 'Width',
    'tankInfo.material': 'Material',
    'tankInfo.pressure': 'Pressure',
    'tankInfo.temperature': 'Temperature',

    // Analysis Information
    'analysisInfo.title': 'Analysis Information',
    'analysisInfo.reportId': 'Report ID',
    'analysisInfo.analysisDate': 'Analysis Date',
    'analysisInfo.createdDate': 'Created Date',
    'analysisInfo.lastUpdated': 'Last Updated',
    'analysisInfo.notes': 'Notes',
    'analysisInfo.autoGenerated': 'Auto generated',
    'analysisInfo.manuallyCreated': 'Manually created',

    // Auto Analysis
    'autoAnalysis.title': 'Auto Analysis',
    'autoAnalysis.triggered': 'Auto analysis triggered',
    'autoAnalysis.source': 'Source',
    'autoAnalysis.excelImport': 'Excel Import',
    'autoAnalysis.manualEntry': 'Manual Entry',
    'autoAnalysis.settings': 'Settings',
    'autoAnalysis.enabled': 'Enabled',
    'autoAnalysis.disabled': 'Disabled',

    // Status & Messages
    'status.loading': 'Loading...',
    'status.noData': 'No data found',
    'status.error': 'Error occurred',
    'status.success': 'Successful',
    'status.failed': 'Failed',
    'status.unspecified': 'Unspecified',

    // Toasts
    'toast.uploadSuccess': 'File uploaded successfully',
    'toast.uploadFailed': 'Upload failed',
    'toast.invalidFileType': 'Invalid file type',
    'toast.invalidFileDescription': 'Please upload an Excel file (.xlsx or .xls)',
    'toast.uploadFailedDescription': 'Failed to upload and process Excel file',
    'toast.fileTooLarge': 'File too large',
    'toast.featureComingSoon': 'Feature coming soon',
    'toast.featureComingSoonDescription': 'Bulk import feature will be available soon',

    // Cost Analysis
    'cost.materialCost': 'Material Cost',
    'cost.laborCost': 'Labor Cost',
    'cost.overheadCost': 'Overhead Cost',
    'cost.totalCost': 'Total Cost',

    // Tank Types
    'tankType.storageTank': 'Storage Tank',
    'tankType.pressureVessel': 'Pressure Vessel',
    'tankType.heatExchanger': 'Heat Exchanger',

    // Common
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.date': 'Date',
    'common.name': 'Name',
    'common.type': 'Type',
    'common.description': 'Description',
    'common.notes': 'Notes',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',

    // Settings Page
    'settings.subtitle': 'Manage system settings and configure cost analysis parameters',
    'settings.updateSuccess': 'Settings updated successfully',
    'settings.updateFailed': 'Failed to update settings',
    'settings.notFound': 'Settings not found',
    
    // Language Settings
    'settings.language.title': 'Language and Localization',
    'settings.language.label': 'Interface Language',
    
    // Currency Settings
    'settings.currency.title': 'Currency Settings',
    'settings.currency.primary': 'Primary Currency',
    'settings.currency.eurRate': 'EUR/USD Rate',
    'settings.currency.tryRate': 'TRY/USD Rate',
    
    // Cost Calculation Settings
    'settings.cost.title': 'Cost Calculation Parameters',
    'settings.cost.materialMultiplier': 'Material Cost Multiplier',
    'settings.cost.laborMultiplier': 'Labor Cost Multiplier',
    'settings.cost.overheadMultiplier': 'Overhead Cost Multiplier',
    'settings.cost.steelPrice': 'Steel Price (USD/kg)',
    'settings.cost.laborRate': 'Hourly Labor Rate (USD)',
    'settings.cost.overheadPercent': 'Overhead Percentage (%)',
    
    // AI Analysis Settings
    'settings.ai.title': 'AI Analysis Settings',
    'settings.ai.autoAnalysis': 'Auto Analysis',
    'settings.ai.autoAnalysisDescription': 'Automatically analyze new records for cost analysis',
    'settings.ai.confidenceThreshold': 'Confidence Threshold',
    'settings.ai.confidenceDescription': 'Minimum confidence level for analysis results (0-1)',
    
    // Import Guidelines - Required Columns
    'import.guideline.reportId': 'Report ID - Unique identifier for cost analysis',
    'import.guideline.tankType': 'Tank Type - Storage Tank, Pressure Vessel or Heat Exchanger',
    'import.guideline.tankName': 'Tank Name - Descriptive name for tank',
    'import.guideline.capacity': 'Capacity - Tank capacity in liters',
    'import.guideline.height': 'Height - Tank height in millimeters',
    'import.guideline.materialCost': 'Material Cost - Material cost in USD',
    'import.guideline.laborCost': 'Labor Cost - Labor costs in USD',
    'import.guideline.overheadCost': 'Overhead Cost - Overhead costs in USD',
    'import.guideline.totalCost': 'Total Cost - Total project cost in USD',
    
    // Import Guidelines - Optional Columns  
    'import.guideline.material': 'Material - Steel grade or material type',
    'import.guideline.thickness': 'Thickness - Wall thickness in millimeters',
    'import.guideline.pressure': 'Pressure - Operating pressure in bar',
    'import.guideline.temperature': 'Temperature - Operating temperature in Celsius',
    
    // Import Guidelines - File Requirements
    'import.guideline.maxFileSize': 'Maximum file size: 10MB',
    'import.guideline.supportedFormats': 'Supported formats: .xlsx, .xls',
    'import.guideline.dataStartRow': 'Data should start from row 2 (row 1 for headers)',
    'import.guideline.requiredColumnsPresent': 'All required columns must be present',
    
    // Logout
    'action.logout': 'Logout'
  }
};

type TranslationKey = keyof typeof translations.tr;

interface I18nContextType {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  language: string;
  setLanguage: (lang: string) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguage] = useState<string>('tr');

  useEffect(() => {
    // Load language preference from localStorage
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const currentTranslations = translations[language as keyof typeof translations] as Record<string, string> | undefined;
    let value = currentTranslations?.[key] || translations.tr[key] || key;
    
    // Handle interpolation
    if (params && typeof value === 'string') {
      value = value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return value;
  };

  return (
    <I18nContext.Provider value={{ t, language, setLanguage: handleSetLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

// Alias for useTranslation to match common naming patterns
export const useI18n = useTranslation;