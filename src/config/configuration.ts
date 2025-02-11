export default () => ({
  environment: process.env.NODE_ENV || 'local',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://localhost/test_pulse_local',
});
