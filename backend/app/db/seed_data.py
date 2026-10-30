SAMPLE_PRODUCTS = [
    {
        "id": "prod_apple_iphone_15_pro",
        "name": "Apple iPhone 15 Pro (128GB, Natural Titanium)",
        "brand": "Apple",
        "model": "iPhone 15 Pro",
        "category": "smartphone",
        "description": "Titanium design with A17 Pro chip, customizable Action button, and versatile 48MP camera system. Features native USB-C port with USB 3 speeds.",
        "image_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600",
        "additional_images": [
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200"
        ],
        "price": 999.00,
        "currency": "USD",
        "specifications": {
            "port_type": "USB-C",
            "usb_standard": "USB 3.2 Gen 2 (up to 10Gbps)",
            "charging_protocols": ["USB Power Delivery (PD 3.0)", "Qi2", "MagSafe"],
            "max_charging_wattage_w": 27.0,
            "min_recommended_charger_w": 20.0,
            "video_out_support": "DisplayPort over USB-C up to 4K 60Hz",
            "os": "iOS",
            "os_version": "17.0",
            "bluetooth_version": "5.3",
            "dimensions_mm": {"height": 146.6, "width": 70.6, "depth": 8.25},
            "screen_size_inches": 6.1,
            "headphone_jack_3_5mm": False,
            "wireless_charging": True
        },
        "spec_source": "Apple Technical Specifications - iPhone 15 Pro (Model A2848)",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_apple_iphone_14",
        "name": "Apple iPhone 14 (128GB, Midnight)",
        "brand": "Apple",
        "model": "iPhone 14",
        "category": "smartphone",
        "description": "Dual camera system, Ceramic Shield front, A15 Bionic chip, and Lightning connector interface.",
        "image_url": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600",
        "additional_images": [],
        "price": 699.00,
        "currency": "USD",
        "specifications": {
            "port_type": "Lightning",
            "usb_standard": "USB 2.0 (480Mbps)",
            "charging_protocols": ["USB Power Delivery (PD 2.0)", "MagSafe", "Qi"],
            "max_charging_wattage_w": 20.0,
            "min_recommended_charger_w": 20.0,
            "os": "iOS",
            "os_version": "16.0",
            "bluetooth_version": "5.3",
            "dimensions_mm": {"height": 146.7, "width": 71.5, "depth": 7.80},
            "screen_size_inches": 6.1,
            "headphone_jack_3_5mm": False,
            "wireless_charging": True
        },
        "spec_source": "Apple Technical Specifications - iPhone 14 (Model A2649)",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_samsung_galaxy_s24_ultra",
        "name": "Samsung Galaxy S24 Ultra (256GB, Titanium Gray)",
        "brand": "Samsung",
        "model": "Galaxy S24 Ultra",
        "category": "smartphone",
        "description": "Snapdragon 8 Gen 3 for Galaxy, Quad Telephoto system, built-in S Pen, and Super Fast Charging 2.0 (45W).",
        "image_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600",
        "additional_images": [],
        "price": 1299.99,
        "currency": "USD",
        "specifications": {
            "port_type": "USB-C",
            "usb_standard": "USB 3.2 Gen 1 (up to 5Gbps)",
            "charging_protocols": ["USB Power Delivery (PD 3.0)", "PPS", "Fast Wireless Charging 2.0"],
            "max_charging_wattage_w": 45.0,
            "min_recommended_charger_w": 25.0,
            "video_out_support": "DisplayPort over USB-C (Samsung DeX)",
            "os": "Android",
            "os_version": "14.0",
            "bluetooth_version": "5.3",
            "supported_audio_codecs": ["LDAC", "aptX", "AAC", "SBC", "Samsung Seamless Codec"],
            "dimensions_mm": {"height": 162.3, "width": 79.0, "depth": 8.6},
            "screen_size_inches": 6.8,
            "headphone_jack_3_5mm": False,
            "wireless_charging": True
        },
        "spec_source": "Samsung Official Galaxy S24 Ultra Technical Datasheet (SM-S928B)",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_apple_macbook_pro_14_m3",
        "name": "Apple MacBook Pro 14-inch (M3 Pro, 18GB RAM, 512GB SSD, Space Black)",
        "brand": "Apple",
        "model": "MacBook Pro 14 (M3 Pro)",
        "category": "laptop",
        "description": "Liquid Retina XDR display, M3 Pro chip, MagSafe 3, three Thunderbolt 4 ports, HDMI port, SDXC card slot.",
        "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600",
        "additional_images": [],
        "price": 1999.00,
        "currency": "USD",
        "specifications": {
            "port_type": "USB-C / Thunderbolt 4",
            "connector_types_available": ["USB-C", "Thunderbolt 4", "MagSafe 3", "HDMI 2.1"],
            "charging_protocols": ["USB Power Delivery (PD 3.1)", "MagSafe 3"],
            "max_charging_wattage_w": 96.0,
            "min_recommended_charger_w": 70.0,
            "video_out_support": "Thunderbolt 4 / DisplayPort 1.4 / HDMI 2.1",
            "supported_external_displays": 2,
            "os": "macOS",
            "bluetooth_version": "5.3",
            "headphone_jack_3_5mm": True
        },
        "spec_source": "Apple MacBook Pro (14-inch, Nov 2023) Tech Specs",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_dell_xps_15_9530",
        "name": "Dell XPS 15 (9530, Intel Core i7-13700H, 32GB RAM, RTX 4060)",
        "brand": "Dell",
        "model": "XPS 15 9530",
        "category": "laptop",
        "description": "15.6-inch OLED 3.5K display, Intel 13th Gen, dual Thunderbolt 4 ports, and Type-C Power Delivery charging.",
        "image_url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600",
        "additional_images": [],
        "price": 1899.99,
        "currency": "USD",
        "specifications": {
            "port_type": "USB-C / Thunderbolt 4",
            "connector_types_available": ["USB-C", "Thunderbolt 4"],
            "charging_protocols": ["USB Power Delivery (PD 3.0)"],
            "max_charging_wattage_w": 130.0,
            "min_recommended_charger_w": 100.0,
            "video_out_support": "DisplayPort over USB-C / Thunderbolt 4",
            "os": "Windows",
            "os_version": "11.0",
            "bluetooth_version": "5.2",
            "headphone_jack_3_5mm": True
        },
        "spec_source": "Dell XPS 15 9530 Setup and Specifications Guide",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_anker_737_charger_120w",
        "name": "Anker 737 Charger (GaNPrime 120W, 3 Ports)",
        "brand": "Anker",
        "model": "737 GaNPrime (A2148)",
        "category": "charger",
        "description": "High-speed multi-device GaN wall charger with 2 USB-C ports and 1 USB-A port with PowerIQ 4.0 dynamic power distribution.",
        "image_url": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600",
        "additional_images": [],
        "price": 79.99,
        "currency": "USD",
        "specifications": {
            "connector_type": "USB-C",
            "output_ports": ["USB-C", "USB-C", "USB-A"],
            "supported_protocols": ["USB Power Delivery (PD 3.0)", "PPS", "PowerIQ 4.0", "QC 3.0"],
            "max_output_wattage_w": 120.0,
            "single_port_max_wattage_w": 100.0,
            "voltage_amperage_profiles": ["5V/3A", "9V/3A", "15V/3A", "20V/5A"],
            "input_voltage_range_v": "100V-240V AC (Global Dual Voltage)"
        },
        "spec_source": "Anker Official Technical Specification Sheet & USB-IF Certification ID 6482",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_apple_20w_charger",
        "name": "Apple 20W USB-C Power Adapter",
        "brand": "Apple",
        "model": "MHJA3AM/A",
        "category": "charger",
        "description": "Compact USB-C wall adapter supporting USB Power Delivery up to 20W for iPhone, iPad, and Apple Watch.",
        "image_url": "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600",
        "additional_images": [],
        "price": 19.00,
        "currency": "USD",
        "specifications": {
            "connector_type": "USB-C",
            "output_ports": ["USB-C"],
            "supported_protocols": ["USB Power Delivery (PD 3.0)"],
            "max_output_wattage_w": 20.0,
            "single_port_max_wattage_w": 20.0,
            "voltage_amperage_profiles": ["5V/3A", "9V/2.22A"],
            "input_voltage_range_v": "100V-240V AC"
        },
        "spec_source": "Apple 20W USB-C Power Adapter Environmental & Electrical Report",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_anker_lightning_cable_mfi",
        "name": "Anker PowerLine III USB-C to Lightning Cable (6ft, White)",
        "brand": "Anker",
        "model": "PowerLine III A8833",
        "category": "cable",
        "description": "MFi certified USB-C to Lightning cable engineered for high-speed charging and durable bend tolerance.",
        "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600",
        "additional_images": [],
        "price": 16.99,
        "currency": "USD",
        "specifications": {
            "source_connector": "USB-C",
            "target_connector": "Lightning",
            "supported_protocols": ["USB Power Delivery (PD 2.0)", "USB Power Delivery (PD 3.0)"],
            "max_supported_wattage_w": 30.0,
            "mfi_certified": True,
            "data_transfer_speed_mbps": 480,
            "video_transfer_support": False
        },
        "spec_source": "Apple MFi Licensee Database & Anker Product Compliance Registry",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_anker_usbc_to_usbc_100w_cable",
        "name": "Anker 100W USB-C to USB-C Fast Charging Cable (6ft, Black)",
        "brand": "Anker",
        "model": "A8758",
        "category": "cable",
        "description": "5A / 100W E-Marker embedded Type-C cable for high-powered laptops, tablets, and smartphones.",
        "image_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600",
        "additional_images": [],
        "price": 12.99,
        "currency": "USD",
        "specifications": {
            "source_connector": "USB-C",
            "target_connector": "USB-C",
            "supported_protocols": ["USB Power Delivery (PD 3.0)", "PPS"],
            "max_supported_wattage_w": 100.0,
            "max_amperage_a": 5.0,
            "emarker_chip": True,
            "data_transfer_speed_mbps": 480,
            "video_transfer_support": False
        },
        "spec_source": "USB Implementers Forum (USB-IF) Test ID 4329",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_dell_u2723qe_4k_monitor",
        "name": "Dell UltraSharp 27 4K USB-C Hub Monitor (U2723QE)",
        "brand": "Dell",
        "model": "U2723QE",
        "category": "monitor",
        "description": "27-inch 4K IPS Black monitor with 90W Power Delivery over USB-C, RJ45 Ethernet, DisplayPort 1.4, and HDMI 2.0.",
        "image_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600",
        "additional_images": [],
        "price": 579.99,
        "currency": "USD",
        "specifications": {
            "screen_size_inches": 27.0,
            "resolution": "3840 x 2160 (4K UHD)",
            "refresh_rate_hz": 60,
            "video_inputs": ["USB-C (DP Alt Mode)", "DisplayPort 1.4", "HDMI 2.0"],
            "usb_c_power_delivery_w": 90.0,
            "hdcp_version": "HDCP 2.2",
            "supported_protocols": ["DisplayPort Alt Mode", "USB-C Power Delivery"],
            "daisy_chain_support": True
        },
        "spec_source": "Dell UltraSharp U2723QE Technical Guide & VESA Compliance Report",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_apple_watch_series_9",
        "name": "Apple Watch Series 9 GPS 41mm (Midnight Aluminum Case)",
        "brand": "Apple",
        "model": "Series 9 (A2978)",
        "category": "smartwatch",
        "description": "S9 SiP with Double Tap gesture, brighter display, on-device Siri, and advanced health sensors.",
        "image_url": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600",
        "additional_images": [],
        "price": 399.00,
        "currency": "USD",
        "specifications": {
            "compatible_os": "iOS",
            "min_os_version": "iOS 17.0",
            "compatible_phone_models": ["iPhone Xs or later"],
            "android_support": False,
            "bluetooth_version": "5.3",
            "companion_app": "Apple Watch App",
            "wireless_charging_standard": "Apple Magnetic Fast Charging"
        },
        "spec_source": "Apple Technical Specs - Apple Watch Series 9 (Requirements Section)",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_samsung_galaxy_watch_6",
        "name": "Samsung Galaxy Watch 6 (44mm, Bluetooth, Graphite)",
        "brand": "Samsung",
        "model": "Galaxy Watch 6 (SM-R940)",
        "category": "smartwatch",
        "description": "Wear OS Powered by Samsung, advanced sleep tracking, personalized HR zones, and sapphire crystal glass.",
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
        "additional_images": [],
        "price": 299.99,
        "currency": "USD",
        "specifications": {
            "compatible_os": "Android",
            "min_os_version": "Android 10.0",
            "requires_google_mobile_services": True,
            "compatible_phone_models": ["Android smartphone with Android 10.0+ and 1.5GB+ RAM"],
            "ios_support": False,
            "bluetooth_version": "5.3",
            "companion_app": "Galaxy Wearable (Samsung Gear)"
        },
        "spec_source": "Samsung Galaxy Watch 6 Compatibility & Requirement Specifications",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_sony_wh1000xm5",
        "name": "Sony WH-1000XM5 Wireless Noise-Canceling Headphones (Black)",
        "brand": "Sony",
        "model": "WH-1000XM5",
        "category": "audio",
        "description": "Two processors and 8 microphones for industry-leading noise cancellation. Supports Hi-Res Audio Wireless with LDAC.",
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
        "additional_images": [],
        "price": 399.99,
        "currency": "USD",
        "specifications": {
            "connection_types": ["Bluetooth", "3.5mm Analog Audio Cable"],
            "bluetooth_version": "5.2",
            "bluetooth_codecs": ["LDAC", "AAC", "SBC"],
            "headphone_jack_3_5mm_required": False,
            "wired_cable_included": True,
            "multipoint_support": True,
            "companion_app": "Sony Headphones Connect (iOS & Android)"
        },
        "spec_source": "Sony Help Guide WH-1000XM5 Operating Instructions",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_apple_case_iphone_15_pro_finewoven",
        "name": "Apple FineWoven Case with MagSafe for iPhone 15 Pro (Taupe)",
        "brand": "Apple",
        "model": "MT4H3ZM/A",
        "category": "case",
        "description": "Durable microtwill material made from 68% post-consumer recycled content, with built-in magnets for MagSafe.",
        "image_url": "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600",
        "additional_images": [],
        "price": 59.00,
        "currency": "USD",
        "specifications": {
            "target_device_model": "iPhone 15 Pro",
            "compatible_brand": "Apple",
            "magsafe_compatible": True,
            "screen_size_inches": 6.1,
            "form_factor_dimensions_mm": {"height": 146.6, "width": 70.6, "depth": 8.25}
        },
        "spec_source": "Apple Store Product Datasheet - FineWoven iPhone 15 Pro Case",
        "verification_status": "verified",
        "is_active": True
    },
    {
        "id": "prod_generic_usb_hub_unverified",
        "name": "Generic Mini 4-in-1 Hub",
        "brand": "Generic",
        "model": "HUB-MINI-01",
        "category": "hub",
        "description": "Multi-port compact accessory hub with unknown power delivery ratings.",
        "image_url": "https://images.unsplash.com/photo-1622445262464-84b150777731?w=600",
        "additional_images": [],
        "price": 14.99,
        "currency": "USD",
        "specifications": {
            "port_type": "USB-C"
            # Missing critical wattage, supported protocols, video specs
        },
        "spec_source": "Unbranded OEM packaging",
        "verification_status": "unverified",
        "is_active": True
    }
]

try:
    from backend.app.db.catalog_data_300 import CATALOG_PRODUCTS_300
    _orig_ids = {p["id"] for p in SAMPLE_PRODUCTS}
    for _p in CATALOG_PRODUCTS_300:
        if _p["id"] not in _orig_ids:
            SAMPLE_PRODUCTS.append(_p)
            _orig_ids.add(_p["id"])
except Exception:
    pass

try:
    from backend.app.db.fashion_catalog_data import FASHION_PRODUCTS
    for _fp in FASHION_PRODUCTS:
        if _fp['id'] not in _orig_ids:
            SAMPLE_PRODUCTS.append(_fp)
            _orig_ids.add(_fp['id'])
except Exception:
    pass
