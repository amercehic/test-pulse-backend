export default () => ({
    environment: process.env.NODE_ENV || 'local',
    port: parseInt(process.env.PORT || '3000', 10), // Default value of '3000' if undefined
    databaseUrl: process.env.DATABASE_URL || 'postgres://localhost/test_pulse_local',
  });
  