// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface LaptopKatalog {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    hersteller_name?: string;
    preis?: number;
    modellname?: string;
    verfuegbarkeit?: LookupValue;
    laptop_bild?: string;
    usage?: LookupValue[];
    betriebssystem?: LookupValue;
    bildschirmgroesse?: number;
    aufloesung?: LookupValue;
    display_typ?: LookupValue;
    touchscreen?: boolean;
    prozessor?: string;
    prozessor_hersteller?: LookupValue;
    ram_gb?: number;
    grafikkarte?: string;
    grafikkarte_typ?: LookupValue;
    speicher_gb?: number;
    speicher_typ?: LookupValue;
    akkulaufzeit_h?: number;
    akkukapazitaet_wh?: number;
    gewicht_kg?: number;
    anschluesse?: LookupValue[];
    wlan?: LookupValue;
    bluetooth?: boolean;
    lte_5g?: boolean;
    farbe?: string;
    tastaturbeleuchtung?: boolean;
    webcam?: boolean;
    garantie_jahre?: number;
    besonderheiten?: string;
  };
}

export interface Bestellungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kunde_vorname?: string;
    kunde_nachname?: string;
    kunde_email?: string;
    kunde_telefon?: string;
    adresse_strasse?: string;
    adresse_hausnummer?: string;
    adresse_plz?: string;
    adresse_ort?: string;
    laptop_ref?: string; // applookup -> URL zu 'LaptopKatalog' Record
    menge?: number;
    bestelldatum?: string; // Format: YYYY-MM-DD oder ISO String
    zahlungsart?: LookupValue;
    lieferadresse_abweichend?: boolean;
    bestellstatus?: LookupValue;
    bemerkungen?: string;
  };
}

export const APP_IDS = {
  LAPTOP_KATALOG: '69fb75ec0e449f5ac74b7870',
  BESTELLUNGEN: '69fb75f02b467025344bf46c',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'laptop_katalog': {
    verfuegbarkeit: [{ key: "nicht_auf_lager", label: "Nicht auf Lager" }, { key: "vorbestellbar", label: "Vorbestellbar" }, { key: "auslaufmodell", label: "Auslaufmodell" }, { key: "auf_lager", label: "Auf Lager" }],
    usage: [{ key: "business", label: "Business" }, { key: "gaming", label: "Gaming" }, { key: "student", label: "Student" }, { key: "kreativ", label: "Kreativ & Design" }, { key: "multimedia", label: "Multimedia" }, { key: "allgemein", label: "Allgemein" }, { key: "outdoor", label: "Outdoor / Robust" }],
    betriebssystem: [{ key: "windows11", label: "Windows 11" }, { key: "windows10", label: "Windows 10" }, { key: "macos", label: "macOS" }, { key: "linux", label: "Linux" }, { key: "chromeos", label: "ChromeOS" }, { key: "ohne_os", label: "Ohne Betriebssystem" }],
    aufloesung: [{ key: "hd", label: "HD (1366x768)" }, { key: "fhd", label: "Full HD (1920x1080)" }, { key: "qhd", label: "2K / QHD (2560x1440)" }, { key: "uhd", label: "4K / UHD (3840x2160)" }, { key: "retina", label: "Retina / Sonstige" }],
    display_typ: [{ key: "ips", label: "IPS" }, { key: "oled", label: "OLED" }, { key: "tn", label: "TN" }, { key: "va", label: "VA" }, { key: "amoled", label: "AMOLED" }],
    prozessor_hersteller: [{ key: "intel", label: "Intel" }, { key: "amd", label: "AMD" }, { key: "apple_silicon", label: "Apple Silicon" }, { key: "qualcomm", label: "Qualcomm" }, { key: "sonstige", label: "Sonstige" }],
    grafikkarte_typ: [{ key: "integriert", label: "Integriert" }, { key: "dediziert", label: "Dediziert" }],
    speicher_typ: [{ key: "ssd", label: "SSD" }, { key: "hdd", label: "HDD" }, { key: "ssd_hdd", label: "SSD + HDD" }, { key: "emmc", label: "eMMC" }],
    anschluesse: [{ key: "usb_a", label: "USB-A" }, { key: "usb_c", label: "USB-C" }, { key: "thunderbolt", label: "Thunderbolt" }, { key: "hdmi", label: "HDMI" }, { key: "displayport", label: "DisplayPort" }, { key: "sd_karte", label: "SD-Kartenleser" }, { key: "ethernet", label: "Ethernet (RJ45)" }, { key: "klinke", label: "Klinke (Audio)" }],
    wlan: [{ key: "wifi5", label: "Wi-Fi 5 (802.11ac)" }, { key: "wifi6", label: "Wi-Fi 6 (802.11ax)" }, { key: "wifi6e", label: "Wi-Fi 6E" }, { key: "wifi7", label: "Wi-Fi 7" }],
  },
  'bestellungen': {
    zahlungsart: [{ key: "vorkasse", label: "Vorkasse" }, { key: "rechnung", label: "Rechnung" }, { key: "paypal", label: "PayPal" }, { key: "kreditkarte", label: "Kreditkarte" }],
    bestellstatus: [{ key: "offen", label: "Offen" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "versandt", label: "Versandt" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "storniert", label: "Storniert" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'laptop_katalog': {
    'hersteller_name': 'string/text',
    'preis': 'number',
    'modellname': 'string/text',
    'verfuegbarkeit': 'lookup/radio',
    'laptop_bild': 'file',
    'usage': 'multiplelookup/checkbox',
    'betriebssystem': 'lookup/select',
    'bildschirmgroesse': 'number',
    'aufloesung': 'lookup/select',
    'display_typ': 'lookup/select',
    'touchscreen': 'bool',
    'prozessor': 'string/text',
    'prozessor_hersteller': 'lookup/radio',
    'ram_gb': 'number',
    'grafikkarte': 'string/text',
    'grafikkarte_typ': 'lookup/radio',
    'speicher_gb': 'number',
    'speicher_typ': 'lookup/radio',
    'akkulaufzeit_h': 'number',
    'akkukapazitaet_wh': 'number',
    'gewicht_kg': 'number',
    'anschluesse': 'multiplelookup/checkbox',
    'wlan': 'lookup/select',
    'bluetooth': 'bool',
    'lte_5g': 'bool',
    'farbe': 'string/text',
    'tastaturbeleuchtung': 'bool',
    'webcam': 'bool',
    'garantie_jahre': 'number',
    'besonderheiten': 'string/textarea',
  },
  'bestellungen': {
    'kunde_vorname': 'string/text',
    'kunde_nachname': 'string/text',
    'kunde_email': 'string/email',
    'kunde_telefon': 'string/tel',
    'adresse_strasse': 'string/text',
    'adresse_hausnummer': 'string/text',
    'adresse_plz': 'string/text',
    'adresse_ort': 'string/text',
    'laptop_ref': 'applookup/select',
    'menge': 'number',
    'bestelldatum': 'date/date',
    'zahlungsart': 'lookup/radio',
    'lieferadresse_abweichend': 'bool',
    'bestellstatus': 'lookup/radio',
    'bemerkungen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateLaptopKatalog = StripLookup<LaptopKatalog['fields']>;
export type CreateBestellungen = StripLookup<Bestellungen['fields']>;