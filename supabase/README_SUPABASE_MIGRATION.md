# 🚀 Gabay sa Paglipat ng Supabase Database & Settings (Migration Guide)

Lahat ng tables, schema definitions, Row Level Security (RLS) policies, storage bucket configurations, at mga kasalukuyang datos (signatures, 206 requirements, memos, user settings, incident reports, chat messages, profiles) ay na-export at handa nang ilipat.

---

## 📁 Mga Bagong SQL Files na Ginawa sa `/supabase`

1. **[`supabase/00_FULL_MIGRATION_AND_DATA.sql`](file:///c:/Users/JAY%20RYAN%20LIM/Videos/hrhub-app/supabase/00_FULL_MIGRATION_AND_DATA.sql)**  
   ⭐ **(PINAKAMABILIS - 1-Click Master Script)**: Pinagsamang Database Schema + RLS Policies + Storage Buckets + Lahat ng Records & Settings na kasalukuyang nasa database. Isang run lang sa bagong Supabase project, kumpleto agad lahat!

2. **[`supabase/01_master_database_schema.sql`](file:///c:/Users/JAY%20RYAN%20LIM/Videos/hrhub-app/supabase/01_master_database_schema.sql)**  
   Pure DDL & Policies lamang kung nais mong gumawa muna ng malinis na schema nang walang lumang data:
   - 8 Tables: `employees`, `profiles`, `user_settings`, `saved_memos`, `incident_reports`, `agent_requirements`, `chat_messages`, `memos`
   - Complete RLS Policies para sa bawat table
   - Storage Buckets: `requirements`, `nte-proofs`, `chat-attachments` + Storage Access Policies

3. **[`supabase/02_database_data_backup.sql`](file:///c:/Users/JAY%20RYAN%20LIM/Videos/hrhub-app/supabase/02_database_data_backup.sql)**  
   Pure Data Inserts (`INSERT ... ON CONFLICT DO UPDATE`) para sa lahat ng datos na na-export mula sa lumang Supabase project.

---

## 📋 Hakbang-hakbang na Proseso ng Paglipat (Step-by-Step)

### Hakbang 1: Gumawa ng Bagong Supabase Project
1. Pumunta sa [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. I-click ang **"New project"**.
3. Piliin ang iyong Organization, maglagay ng Project Name (hal. `hrhub-production`), at mag-set ng secure Database Password.

---

### Hakbang 2: I-run ang SQL Migration Script
1. Sa iyong **Bagong Supabase Project Dashboard**, pumunta sa menu sa kaliwa at i-click ang **SQL Editor** (icon na may `>_`).
2. I-click ang **"New Query"** (+ button).
3. Buksan ang file na **[`00_FULL_MIGRATION_AND_DATA.sql`](file:///c:/Users/JAY%20RYAN%20LIM/Videos/hrhub-app/supabase/00_FULL_MIGRATION_AND_DATA.sql)**, kopyahin ang buong laman nito, at i-paste sa SQL Editor.
4. Pindutin ang berdeng button na **"Run"** (o `Ctrl + Enter`).
5. Hintaying lumabas ang berdeng mensahe: **"Success. No rows returned"**.

> [!TIP]
> Kapag nag-run ang script, awtomatiko nitong gagawin ang:
> - 8 Tables na may kaukulang columns, default values, at primary keys
> - Pag-disable sa foreign key blocking sa `profiles` table (para ma-activate agad ang mga pre-registered accounts)
> - Row Level Security (RLS) policies para sa instant reading/writing
> - Storage Buckets: `requirements`, `nte-proofs`, `chat-attachments`
> - Pag-restore sa lahat ng 206 uploaded requirements, user signature settings, official memos, at employee records.

---

### Hakbang 3: Kunin ang Bagong API Credentials
1. Sa iyong Bagong Supabase Dashboard, pumunta sa **Project Settings** (gear icon sa bandang ibaba sa kaliwa).
2. I-click ang **Data API** (o **API**).
3. Kopyahin ang:
   - **Project URL** (hal. `https://xyzcompany.supabase.co`)
   - **anon public key** (mahabang token na nagsisimula sa `eyJhbGciOi...`)

---

### Hakbang 4: I-update ang Application sa Bagong Supabase Credentials

Buksan ang **[`src/config/apiConfig.js`](file:///c:/Users/JAY%20RYAN%20LIM/Videos/hrhub-app/src/config/apiConfig.js)** o ang iyong `.env` file:

```javascript
// src/config/apiConfig.js
export const API_CONFIG = {
  // Palitan ang SUPABASE_URL at SUPABASE_ANON ng inyong bagong credentials:
  SUPABASE_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "https://BAGONG_PROJECT_ID.supabase.co",
  SUPABASE_ANON: (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_ANON) || "BAGONG_ANON_PUBLIC_KEY",
  ...
```

Kung gumagamit ka ng `.env` o `.env.local`:
```env
VITE_API_URL=https://BAGONG_PROJECT_ID.supabase.co
VITE_API_ANON=BAGONG_ANON_PUBLIC_KEY
```

---

### Hakbang 5: I-test ang App
I-restart ang app (hal. `npm run dev`) at subukang mag-login, mag-post ng memo, at mag-check ng Employee Directory. Agad nang maglo-load ang lahat mula sa bago mong Supabase database!
