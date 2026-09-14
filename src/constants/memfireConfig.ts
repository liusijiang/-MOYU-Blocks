// MemFireDB 公开客户端配置 (仅使用公开匿名 Key, 严禁包含 service_role)
const DEFAULT_URL = 'https://d4v5cc8g91htqli3veng.baseapi.memfiredb.com';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0MjQ5Mjk3NywiaWF0IjoxNzY1NjkyOTc3LCJpc3MiOiJzdXBhYmFzZSJ9.8WvEQ-9X7R5r2g-M1tnjOzYhRPcxiqzRKwQAH66NDG4';

export const MEMFIRE_CONFIG = {
  url:
    process.env.FIRE_DB_URL ||
    ((import.meta as any).env?.VITE_FIRE_DB_URL as string) ||
    DEFAULT_URL,
  anonKey:
    process.env.FIRE_DB_ANON ||
    ((import.meta as any).env?.VITE_FIRE_DB_ANON as string) ||
    DEFAULT_ANON_KEY,
  tablePrefix: '_block',
  tables: {
    users: '_block_users',
    leaderboard: '_block_leaderboard',
    progress: '_block_game_progress',
  },
};
