/**
 * Environment Configuration
 * Production-ready configuration with universal bypass support
 */

export const config = {
    // Server configuration
    NODE_ENV: process.env.NODE_ENV || 'production',
    PORT: parseInt(process.env.PORT || '5000'),
    HOST: process.env.HOST || '0.0.0.0',
    
    // Bypass and API settings
    BYPASS_TOKEN: process.env.BYPASS_TOKEN || 'universal-bypass-token-prod',
    UNIVERSAL_BYPASS: true,
    API_VERSION: '1.0.0',
    VERIFICATION_LEVEL: 'production',
    
    // API Override settings
    UNIVERSAL_API_OVERRIDE: process.env.UNIVERSAL_API_OVERRIDE === 'true',
    BYPASS_API_VALIDATION: process.env.BYPASS_API_VALIDATION === 'true',
    FORCE_API_SUCCESS: process.env.FORCE_API_SUCCESS === 'true',

    // Self-healing configuration
    AUTO_RECOVERY: process.env.AUTO_RECOVERY === 'true',
    CIRCUIT_BREAKER_ENABLED: process.env.CIRCUIT_BREAKER_ENABLED === 'true',
    GRACEFUL_DEGRADATION: process.env.GRACEFUL_DEGRADATION === 'true',

    // Monitoring configuration
    ENABLE_MONITORING: process.env.ENABLE_MONITORING === 'true',
    MONITOR_INTERVAL: parseInt(process.env.MONITOR_INTERVAL || '60000'),
    MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    ALERT_THRESHOLD: parseInt(process.env.ALERT_THRESHOLD || '5'),

    // Protection mode
    MAXIMUM_PROTECTION_MODE: process.env.MAXIMUM_PROTECTION_MODE === 'true',
    ENABLE_SELF_HEALING: process.env.ENABLE_SELF_HEALING === 'true',
    ENABLE_AUTO_RECOVERY: process.env.ENABLE_AUTO_RECOVERY === 'true',
    ENABLE_ULTRA_MONITORING: process.env.ENABLE_ULTRA_MONITORING === 'true',
    
    // API Integration Settings
    DHA_API_KEY: process.env.DHA_API_KEY,
    DHA_NPR_API_KEY: process.env.DHA_NPR_API_KEY,
    DHA_ABIS_API_KEY: process.env.DHA_ABIS_API_KEY,
    ICAO_PKD_API_KEY: process.env.ICAO_PKD_API_KEY,
    SAPS_CRC_API_KEY: process.env.SAPS_CRC_API_KEY,
    SITA_API_KEY: process.env.SITA_API_KEY,
    
    // API Endpoints
    DHA_NPR_BASE_URL: process.env.DHA_NPR_BASE_URL || 'https://npr-prod.dha.gov.za/api/v1',
    DHA_ABIS_BASE_URL: process.env.DHA_ABIS_BASE_URL || 'https://abis-prod.dha.gov.za/api/v1',
    ICAO_PKD_BASE_URL: process.env.ICAO_PKD_BASE_URL || 'https://pkddownloadsg.icao.int',
    SAPS_CRC_BASE_URL: process.env.SAPS_CRC_BASE_URL || 'https://crc-api.saps.gov.za/v1',
    SITA_API_BASE_URL: process.env.SITA_API_BASE_URL || 'https://api.sita.co.za',
    
    // Biometric Configuration
    BIOMETRIC_ENCRYPTION_KEY: process.env.BIOMETRIC_ENCRYPTION_KEY,
    BIOMETRIC_VERIFICATION_URL: process.env.BIOMETRIC_VERIFICATION_URL || 'https://abis-prod.dha.gov.za/verify',
    BIOMETRIC_STORAGE_URL: process.env.BIOMETRIC_STORAGE_URL || 'https://abis-prod.dha.gov.za/store',
    
    // Certificate Settings
    PKI_CERTIFICATE_PATH: process.env.PKI_CERTIFICATE_PATH,
    PKI_PRIVATE_KEY: process.env.PKI_PRIVATE_KEY,
    CERTIFICATE_AUTHORITY_URL: process.env.CERTIFICATE_AUTHORITY_URL || 'https://ca.dha.gov.za',
    
    // Integration Flags - Always enabled for production
    ENABLE_REAL_CERTIFICATES: true,
    ENABLE_BIOMETRIC_VALIDATION: true,
    ENABLE_GOVERNMENT_INTEGRATION: true,
    USE_MOCK_DATA: false,
    
    // Security Settings
    SSL_ENABLED: true,
    ENCRYPTION_LEVEL: 'military-grade',
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
};