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
  'import.guideline.requiredColumnsPresent': 'Tüm gerekli sütunlar bulunmalı'
  },
  en: {
    // English translations can be added later
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