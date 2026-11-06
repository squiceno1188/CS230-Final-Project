create table if not exists leads (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null check (kind in ('buyer', 'seller')),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'appointment', 'offer', 'closed', 'nurture', 'lost')),
  score integer not null default 0,
  score_reasons jsonb not null default '[]'::jsonb,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  preferred_contact text not null default 'either',
  consent boolean not null default false,
  timeline text not null,
  areas jsonb not null default '[]'::jsonb,
  notes_from_lead text not null default '',
  budget_min integer,
  budget_max integer,
  beds integer,
  property_types jsonb not null default '[]'::jsonb,
  financing text,
  must_haves text not null default '',
  address text not null default '',
  city text not null default '',
  property_type text not null default '',
  baths text not null default '',
  occupancy text not null default '',
  motivation text not null default '',
  price_expectation integer,
  source text not null default 'web',
  source_detail text not null default '',
  sample boolean not null default false,
  duplicate_of text
);

create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists leads_status_idx on leads (status);
create index if not exists leads_kind_idx on leads (kind);
create index if not exists leads_email_idx on leads (email);

create table if not exists lead_notes (
  id text primary key,
  lead_id text not null references leads (id),
  body text not null,
  author_label text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_idx on lead_notes (lead_id, created_at);

create table if not exists lead_events (
  id text primary key,
  lead_id text not null references leads (id),
  kind text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_events_lead_idx on lead_events (lead_id, created_at);
