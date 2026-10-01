--
-- PostgreSQL database dump
--

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: aportes; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.aportes (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    user_id integer,
    participant_name character varying(160) NOT NULL,
    participant_email character varying(200),
    description text NOT NULL,
    file_type character varying(20) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_original_name character varying(255),
    file_mime_type character varying(100),
    file_size_bytes integer,
    caracteristicas jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    rejection_reason text,
    first_pass_by character varying(160),
    first_pass_by_user_id integer,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.aportes OWNER TO tu_usuario;

--
-- Name: aportes_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.aportes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.aportes_id_seq OWNER TO tu_usuario;

--
-- Name: aportes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.aportes_id_seq OWNED BY public.aportes.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor_tipo character varying(20) NOT NULL,
    actor_id integer,
    accion character varying(60) NOT NULL,
    objetivo_tipo character varying(30),
    objetivo_id character varying(40),
    detalle jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_actor_tipo_check CHECK (((actor_tipo)::text = ANY ((ARRAY['usuario'::character varying, 'superusuario'::character varying, 'anonimo'::character varying])::text[])))
);


ALTER TABLE public.audit_log OWNER TO tu_usuario;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO tu_usuario;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: campana_baneados; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.campana_baneados (
    id integer NOT NULL,
    campana_id integer NOT NULL,
    usuario_id integer NOT NULL,
    motivo text NOT NULL,
    baneado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campana_baneados OWNER TO tu_usuario;

--
-- Name: campana_baneados_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.campana_baneados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campana_baneados_id_seq OWNER TO tu_usuario;

--
-- Name: campana_baneados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.campana_baneados_id_seq OWNED BY public.campana_baneados.id;


--
-- Name: campana_revisores; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.campana_revisores (
    id integer NOT NULL,
    campana_id integer NOT NULL,
    usuario_id integer NOT NULL,
    estado character varying(20) DEFAULT 'invitado'::character varying NOT NULL,
    invitado_en timestamp with time zone DEFAULT now() NOT NULL,
    aceptado_en timestamp with time zone,
    CONSTRAINT campana_revisores_estado_check CHECK (((estado)::text = ANY ((ARRAY['invitado'::character varying, 'aceptado'::character varying, 'rechazado'::character varying])::text[])))
);


ALTER TABLE public.campana_revisores OWNER TO tu_usuario;

--
-- Name: campana_revisores_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.campana_revisores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campana_revisores_id_seq OWNER TO tu_usuario;

--
-- Name: campana_revisores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.campana_revisores_id_seq OWNED BY public.campana_revisores.id;


--
-- Name: campana_supervisores; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.campana_supervisores (
    id integer NOT NULL,
    campana_id integer NOT NULL,
    supervisor_id integer,
    accion character varying(30) NOT NULL,
    motivo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    por_superusuario boolean DEFAULT false NOT NULL,
    CONSTRAINT campana_supervisores_accion_check CHECK (((accion)::text = ANY ((ARRAY['aceptada'::character varying, 'rechazada'::character varying, 'reportada'::character varying, 'reasignada'::character varying])::text[]))),
    CONSTRAINT campana_supervisores_autor_check CHECK (((supervisor_id IS NOT NULL) OR por_superusuario))
);


ALTER TABLE public.campana_supervisores OWNER TO tu_usuario;

--
-- Name: campana_supervisores_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.campana_supervisores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campana_supervisores_id_seq OWNER TO tu_usuario;

--
-- Name: campana_supervisores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.campana_supervisores_id_seq OWNED BY public.campana_supervisores.id;


--
-- Name: campanas; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.campanas (
    id integer NOT NULL,
    creator_id integer NOT NULL,
    creator_name character varying(120) NOT NULL,
    supervisor_id integer,
    name character varying(200) NOT NULL,
    description text NOT NULL,
    tematica character varying(120) NOT NULL,
    tag character varying(120) NOT NULL,
    status character varying(50) DEFAULT 'borrador'::character varying NOT NULL,
    data_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    collection_mode character varying(20) DEFAULT 'checklist'::character varying NOT NULL,
    checklist_opciones jsonb DEFAULT '[]'::jsonb NOT NULL,
    goal_contributions integer DEFAULT 0 NOT NULL,
    quota_per_user integer DEFAULT 1 NOT NULL,
    current_contributions integer DEFAULT 0 NOT NULL,
    approved_contributions integer DEFAULT 0 NOT NULL,
    pending_contributions integer DEFAULT 0 NOT NULL,
    rejected_contributions integer DEFAULT 0 NOT NULL,
    participants integer DEFAULT 0 NOT NULL,
    start_date date,
    start_time time without time zone,
    end_date date,
    end_time time without time zone,
    location_city character varying(120),
    location_state character varying(120),
    location_colonia character varying(150),
    organizer character varying(160),
    xp_per_contribution integer DEFAULT 0 NOT NULL,
    is_special boolean DEFAULT false NOT NULL,
    days_remaining integer,
    has_reviewer_assigned boolean DEFAULT false NOT NULL,
    share_token character varying(80),
    share_token_expires_at timestamp with time zone,
    aportes jsonb DEFAULT '[]'::jsonb NOT NULL,
    downloads_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    supervisado_por_root boolean DEFAULT false NOT NULL
);


ALTER TABLE public.campanas OWNER TO tu_usuario;

--
-- Name: campanas_guardadas; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.campanas_guardadas (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    campana_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campanas_guardadas OWNER TO tu_usuario;

--
-- Name: campanas_guardadas_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.campanas_guardadas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campanas_guardadas_id_seq OWNER TO tu_usuario;

--
-- Name: campanas_guardadas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.campanas_guardadas_id_seq OWNED BY public.campanas_guardadas.id;


--
-- Name: campanas_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.campanas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campanas_id_seq OWNER TO tu_usuario;

--
-- Name: campanas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.campanas_id_seq OWNED BY public.campanas.id;


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.notificaciones (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    tipo character varying(50) NOT NULL,
    titulo character varying(180) NOT NULL,
    mensaje text NOT NULL,
    campana_id integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    leida_en timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notificaciones OWNER TO tu_usuario;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.notificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificaciones_id_seq OWNER TO tu_usuario;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.notificaciones_id_seq OWNED BY public.notificaciones.id;


--
-- Name: root_sessions; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.root_sessions (
    id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.root_sessions OWNER TO tu_usuario;

--
-- Name: root_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.root_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.root_sessions_id_seq OWNER TO tu_usuario;

--
-- Name: root_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.root_sessions_id_seq OWNED BY public.root_sessions.id;


--
-- Name: sanciones; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.sanciones (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    tipo character varying(30) NOT NULL,
    detalle text NOT NULL,
    dias integer,
    aplicada_en timestamp with time zone DEFAULT now() NOT NULL,
    aplicada_por character varying(120) DEFAULT 'SuperUsuario'::character varying NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    restaurada_en timestamp with time zone
);


ALTER TABLE public.sanciones OWNER TO tu_usuario;

--
-- Name: sanciones_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.sanciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sanciones_id_seq OWNER TO tu_usuario;

--
-- Name: sanciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.sanciones_id_seq OWNED BY public.sanciones.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    usuario_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO tu_usuario;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO tu_usuario;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: tu_usuario
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(120) NOT NULL,
    apellidos character varying(120) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    state character varying(100),
    city character varying(100),
    specialty character varying(150),
    intereses jsonb DEFAULT '[]'::jsonb NOT NULL,
    role jsonb DEFAULT '["usuario"]'::jsonb NOT NULL,
    xp_total integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    streak_days integer DEFAULT 0 NOT NULL,
    email_verificado boolean DEFAULT false NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    google_id character varying(255),
    verification_code_hash character varying(64),
    verification_code_expires_at timestamp with time zone,
    verification_attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.usuarios OWNER TO tu_usuario;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: tu_usuario
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO tu_usuario;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tu_usuario
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: aportes id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.aportes ALTER COLUMN id SET DEFAULT nextval('public.aportes_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: campana_baneados id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_baneados ALTER COLUMN id SET DEFAULT nextval('public.campana_baneados_id_seq'::regclass);


--
-- Name: campana_revisores id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_revisores ALTER COLUMN id SET DEFAULT nextval('public.campana_revisores_id_seq'::regclass);


--
-- Name: campana_supervisores id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_supervisores ALTER COLUMN id SET DEFAULT nextval('public.campana_supervisores_id_seq'::regclass);


--
-- Name: campanas id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campanas ALTER COLUMN id SET DEFAULT nextval('public.campanas_id_seq'::regclass);


--
-- Name: campanas_guardadas id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campanas_guardadas ALTER COLUMN id SET DEFAULT nextval('public.campanas_guardadas_id_seq'::regclass);


--
-- Name: notificaciones id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id SET DEFAULT nextval('public.notificaciones_id_seq'::regclass);


--
-- Name: root_sessions id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.root_sessions ALTER COLUMN id SET DEFAULT nextval('public.root_sessions_id_seq'::regclass);


--
-- Name: sanciones id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.sanciones ALTER COLUMN id SET DEFAULT nextval('public.sanciones_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: aportes; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.aportes (id, campaign_id, user_id, participant_name, participant_email, description, file_type, file_path, file_original_name, file_mime_type, file_size_bytes, caracteristicas, status, rejection_reason, first_pass_by, first_pass_by_user_id, submitted_at, reviewed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.audit_log (id, actor_tipo, actor_id, accion, objetivo_tipo, objetivo_id, detalle, ip, created_at) FROM stdin;
\.


--
-- Data for Name: campana_baneados; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.campana_baneados (id, campana_id, usuario_id, motivo, baneado_por, created_at) FROM stdin;
\.


--
-- Data for Name: campana_revisores; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.campana_revisores (id, campana_id, usuario_id, estado, invitado_en, aceptado_en) FROM stdin;
\.


--
-- Data for Name: campana_supervisores; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.campana_supervisores (id, campana_id, supervisor_id, accion, motivo, created_at, por_superusuario) FROM stdin;
\.


--
-- Data for Name: campanas; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.campanas (id, creator_id, creator_name, supervisor_id, name, description, tematica, tag, status, data_types, collection_mode, checklist_opciones, goal_contributions, quota_per_user, current_contributions, approved_contributions, pending_contributions, rejected_contributions, participants, start_date, start_time, end_date, end_time, location_city, location_state, location_colonia, organizer, xp_per_contribution, is_special, days_remaining, has_reviewer_assigned, share_token, share_token_expires_at, aportes, downloads_count, created_at, updated_at, supervisado_por_root) FROM stdin;
\.


--
-- Data for Name: campanas_guardadas; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.campanas_guardadas (id, usuario_id, campana_id, created_at) FROM stdin;
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.notificaciones (id, usuario_id, tipo, titulo, mensaje, campana_id, metadata, leida_en, created_at) FROM stdin;
\.


--
-- Data for Name: root_sessions; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.root_sessions (id, token_hash, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: sanciones; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.sanciones (id, usuario_id, tipo, detalle, dias, aplicada_en, aplicada_por, activa, restaurada_en) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.sessions (id, token_hash, usuario_id, created_at, expires_at) FROM stdin;
2	c0f0994438e2cfa1acc6560e31227f587a0dcf968473fc89473a5a1dad07b662	1	2026-09-28 22:19:59.900761	2026-10-28 22:19:59.9+00
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: tu_usuario
--

COPY public.usuarios (id, nombre, apellidos, email, password_hash, state, city, specialty, intereses, role, xp_total, level, streak_days, email_verificado, failed_login_attempts, locked_until, google_id, verification_code_hash, verification_code_expires_at, verification_attempts, created_at, updated_at) FROM stdin;
1	Edgar	Pozas	edgar730a@gmail.com	\N	\N	\N	\N	["Medio ambiente", "Infraestructura", "Movilidad", "Salud urbana"]	["usuario"]	0	1	0	t	0	\N	114649085731838979187	\N	\N	0	2026-09-28 22:19:33.047184	2026-09-28 22:20:09.73232
\.


--
-- Name: aportes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.aportes_id_seq', 1, false);


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


--
-- Name: campana_baneados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.campana_baneados_id_seq', 1, false);


--
-- Name: campana_revisores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.campana_revisores_id_seq', 1, false);


--
-- Name: campana_supervisores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.campana_supervisores_id_seq', 1, false);


--
-- Name: campanas_guardadas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.campanas_guardadas_id_seq', 1, false);


--
-- Name: campanas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.campanas_id_seq', 1, false);


--
-- Name: notificaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.notificaciones_id_seq', 1, false);


--
-- Name: root_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.root_sessions_id_seq', 1, false);


--
-- Name: sanciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.sanciones_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.sessions_id_seq', 2, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tu_usuario
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 1, true);


--
-- Name: aportes aportes_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.aportes
    ADD CONSTRAINT aportes_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: campana_baneados campana_baneados_campana_id_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_baneados
    ADD CONSTRAINT campana_baneados_campana_id_usuario_id_key UNIQUE (campana_id, usuario_id);


--
-- Name: campana_baneados campana_baneados_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_baneados
    ADD CONSTRAINT campana_baneados_pkey PRIMARY KEY (id);


--
-- Name: campana_revisores campana_revisores_campana_id_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_revisores
    ADD CONSTRAINT campana_revisores_campana_id_usuario_id_key UNIQUE (campana_id, usuario_id);


--
-- Name: campana_revisores campana_revisores_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_revisores
    ADD CONSTRAINT campana_revisores_pkey PRIMARY KEY (id);


--
-- Name: campana_supervisores campana_supervisores_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_supervisores
    ADD CONSTRAINT campana_supervisores_pkey PRIMARY KEY (id);


--
-- Name: campanas_guardadas campanas_guardadas_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campanas_guardadas
    ADD CONSTRAINT campanas_guardadas_pkey PRIMARY KEY (id);


--
-- Name: campanas_guardadas campanas_guardadas_usuario_id_campana_id_key; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campanas_guardadas
    ADD CONSTRAINT campanas_guardadas_usuario_id_campana_id_key UNIQUE (usuario_id, campana_id);


--
-- Name: campanas campanas_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campanas
    ADD CONSTRAINT campanas_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: root_sessions root_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.root_sessions
    ADD CONSTRAINT root_sessions_pkey PRIMARY KEY (id);


--
-- Name: root_sessions root_sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.root_sessions
    ADD CONSTRAINT root_sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: sanciones sanciones_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.sanciones
    ADD CONSTRAINT sanciones_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_google_id_key; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_google_id_key UNIQUE (google_id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: audit_log_created_at_idx; Type: INDEX; Schema: public; Owner: tu_usuario
--

CREATE INDEX audit_log_created_at_idx ON public.audit_log USING btree (created_at DESC);


--
-- Name: audit_log_objetivo_idx; Type: INDEX; Schema: public; Owner: tu_usuario
--

CREATE INDEX audit_log_objetivo_idx ON public.audit_log USING btree (objetivo_tipo, objetivo_id);


--
-- Name: aportes aportes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.aportes
    ADD CONSTRAINT aportes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campanas(id) ON DELETE CASCADE;


--
-- Name: aportes aportes_first_pass_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.aportes
    ADD CONSTRAINT aportes_first_pass_by_user_id_fkey FOREIGN KEY (first_pass_by_user_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: aportes aportes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.aportes
    ADD CONSTRAINT aportes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: campana_baneados campana_baneados_baneado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_baneados
    ADD CONSTRAINT campana_baneados_baneado_por_fkey FOREIGN KEY (baneado_por) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: campana_baneados campana_baneados_campana_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_baneados
    ADD CONSTRAINT campana_baneados_campana_id_fkey FOREIGN KEY (campana_id) REFERENCES public.campanas(id) ON DELETE CASCADE;


--
-- Name: campana_baneados campana_baneados_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_baneados
    ADD CONSTRAINT campana_baneados_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: campana_revisores campana_revisores_campana_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_revisores
    ADD CONSTRAINT campana_revisores_campana_id_fkey FOREIGN KEY (campana_id) REFERENCES public.campanas(id) ON DELETE CASCADE;


--
-- Name: campana_revisores campana_revisores_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_revisores
    ADD CONSTRAINT campana_revisores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: campana_supervisores campana_supervisores_campana_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_supervisores
    ADD CONSTRAINT campana_supervisores_campana_id_fkey FOREIGN KEY (campana_id) REFERENCES public.campanas(id) ON DELETE CASCADE;


--
-- Name: campana_supervisores campana_supervisores_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campana_supervisores
    ADD CONSTRAINT campana_supervisores_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: campanas campanas_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campanas
    ADD CONSTRAINT campanas_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: campanas_guardadas campanas_guardadas_campana_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campanas_guardadas
    ADD CONSTRAINT campanas_guardadas_campana_id_fkey FOREIGN KEY (campana_id) REFERENCES public.campanas(id) ON DELETE CASCADE;


--
-- Name: campanas_guardadas campanas_guardadas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campanas_guardadas
    ADD CONSTRAINT campanas_guardadas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: campanas campanas_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.campanas
    ADD CONSTRAINT campanas_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_campana_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_campana_id_fkey FOREIGN KEY (campana_id) REFERENCES public.campanas(id) ON DELETE CASCADE;


--
-- Name: notificaciones notificaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: sanciones sanciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.sanciones
    ADD CONSTRAINT sanciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tu_usuario
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

