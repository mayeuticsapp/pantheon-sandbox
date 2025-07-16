--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

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
-- Name: accounting_movements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.accounting_movements (
    id integer NOT NULL,
    structure_code text NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount text NOT NULL,
    movement_date text NOT NULL,
    payment_method text,
    clients_served integer,
    iqcodes_used integer,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.accounting_movements OWNER TO neondb_owner;

--
-- Name: accounting_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.accounting_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounting_movements_id_seq OWNER TO neondb_owner;

--
-- Name: accounting_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.accounting_movements_id_seq OWNED BY public.accounting_movements.id;


--
-- Name: admin_credits; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.admin_credits (
    id integer NOT NULL,
    admin_code text NOT NULL,
    credits_remaining integer DEFAULT 1000 NOT NULL,
    credits_used integer DEFAULT 0 NOT NULL,
    last_generated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_credits OWNER TO neondb_owner;

--
-- Name: admin_credits_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.admin_credits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_credits_id_seq OWNER TO neondb_owner;

--
-- Name: admin_credits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.admin_credits_id_seq OWNED BY public.admin_credits.id;


--
-- Name: assigned_packages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.assigned_packages (
    id integer NOT NULL,
    recipient_iq_code text NOT NULL,
    package_size integer NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    assigned_by text NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL,
    credits_remaining integer NOT NULL,
    credits_used integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.assigned_packages OWNER TO neondb_owner;

--
-- Name: assigned_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.assigned_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assigned_packages_id_seq OWNER TO neondb_owner;

--
-- Name: assigned_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.assigned_packages_id_seq OWNED BY public.assigned_packages.id;


--
-- Name: available_iq_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.available_iq_codes (
    id integer NOT NULL,
    code text NOT NULL,
    structure_code text NOT NULL,
    original_guest_id integer,
    original_guest_name text,
    package_id integer NOT NULL,
    made_available_at timestamp without time zone DEFAULT now() NOT NULL,
    reason text DEFAULT 'removed_from_guest'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.available_iq_codes OWNER TO neondb_owner;

--
-- Name: available_iq_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.available_iq_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.available_iq_codes_id_seq OWNER TO neondb_owner;

--
-- Name: available_iq_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.available_iq_codes_id_seq OWNED BY public.available_iq_codes.id;


--
-- Name: generated_emotional_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.generated_emotional_codes (
    id integer NOT NULL,
    code text NOT NULL,
    generated_by text NOT NULL,
    package_id integer NOT NULL,
    assigned_to text,
    guest_id integer,
    country text NOT NULL,
    emotional_word text NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    generated_at timestamp without time zone DEFAULT now() NOT NULL,
    assigned_at timestamp without time zone,
    removed_at timestamp without time zone,
    removed_reason text
);


ALTER TABLE public.generated_emotional_codes OWNER TO neondb_owner;

--
-- Name: generated_emotional_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.generated_emotional_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.generated_emotional_codes_id_seq OWNER TO neondb_owner;

--
-- Name: generated_emotional_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.generated_emotional_codes_id_seq OWNED BY public.generated_emotional_codes.id;


--
-- Name: guests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.guests (
    id integer NOT NULL,
    structure_code text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    room_number text,
    checkin_date text,
    checkout_date text,
    notes text,
    assigned_codes integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.guests OWNER TO neondb_owner;

--
-- Name: guests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.guests_id_seq OWNER TO neondb_owner;

--
-- Name: guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.guests_id_seq OWNED BY public.guests.id;


--
-- Name: iq_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.iq_codes (
    id integer NOT NULL,
    code text NOT NULL,
    role text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    assigned_to text,
    location text,
    code_type text,
    approved_at timestamp without time zone,
    approved_by text,
    internal_note text,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    available_one_time_uses integer DEFAULT 10
);


ALTER TABLE public.iq_codes OWNER TO neondb_owner;

--
-- Name: iq_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.iq_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.iq_codes_id_seq OWNER TO neondb_owner;

--
-- Name: iq_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.iq_codes_id_seq OWNED BY public.iq_codes.id;


--
-- Name: iqcode_recharges; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.iqcode_recharges (
    id integer NOT NULL,
    validation_id integer NOT NULL,
    tourist_iq_code text NOT NULL,
    status text DEFAULT 'payment_pending'::text NOT NULL,
    sumup_payment_id text,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp without time zone,
    activated_at timestamp without time zone,
    admin_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.iqcode_recharges OWNER TO neondb_owner;

--
-- Name: iqcode_recharges_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.iqcode_recharges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.iqcode_recharges_id_seq OWNER TO neondb_owner;

--
-- Name: iqcode_recharges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.iqcode_recharges_id_seq OWNED BY public.iqcode_recharges.id;


--
-- Name: iqcode_recovery_keys; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.iqcode_recovery_keys (
    id integer NOT NULL,
    hashed_iqcode text NOT NULL,
    hashed_secret_word text NOT NULL,
    hashed_birth_date text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.iqcode_recovery_keys OWNER TO neondb_owner;

--
-- Name: iqcode_recovery_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.iqcode_recovery_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.iqcode_recovery_keys_id_seq OWNER TO neondb_owner;

--
-- Name: iqcode_recovery_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.iqcode_recovery_keys_id_seq OWNED BY public.iqcode_recovery_keys.id;


--
-- Name: one_time_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.one_time_codes (
    id integer NOT NULL,
    code text NOT NULL,
    tourist_iq_code text NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    used_by text,
    used_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    used_at timestamp without time zone
);


ALTER TABLE public.one_time_codes OWNER TO neondb_owner;

--
-- Name: one_time_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.one_time_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.one_time_codes_id_seq OWNER TO neondb_owner;

--
-- Name: one_time_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.one_time_codes_id_seq OWNED BY public.one_time_codes.id;


--
-- Name: partner_details; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.partner_details (
    id integer NOT NULL,
    partner_code text NOT NULL,
    business_name text NOT NULL,
    business_type text NOT NULL,
    description text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    province text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    website text,
    opening_hours text NOT NULL,
    seasonal_hours text,
    wheelchair_accessible boolean DEFAULT false NOT NULL,
    ramp_width text,
    ramp_slope text,
    elevator_access boolean DEFAULT false NOT NULL,
    accessible_bathroom boolean DEFAULT false NOT NULL,
    parking_spaces integer DEFAULT 0,
    accessible_parking integer DEFAULT 0,
    assistance_available boolean DEFAULT false NOT NULL,
    accessibility_notes text,
    gluten_free boolean DEFAULT false NOT NULL,
    gluten_free_kitchen boolean DEFAULT false NOT NULL,
    dairy_free boolean DEFAULT false NOT NULL,
    nut_free boolean DEFAULT false NOT NULL,
    vegetarian_options boolean DEFAULT false NOT NULL,
    vegan_options boolean DEFAULT false NOT NULL,
    halal_certified boolean DEFAULT false NOT NULL,
    kosher_certified boolean DEFAULT false NOT NULL,
    allergy_training boolean DEFAULT false NOT NULL,
    allergy_menu boolean DEFAULT false NOT NULL,
    allergy_notes text,
    child_friendly boolean DEFAULT false NOT NULL,
    high_chairs boolean DEFAULT false NOT NULL,
    kids_menu boolean DEFAULT false NOT NULL,
    changing_table boolean DEFAULT false NOT NULL,
    play_area boolean DEFAULT false NOT NULL,
    baby_friendly boolean DEFAULT false NOT NULL,
    toddler_friendly boolean DEFAULT false NOT NULL,
    child_friendly_6plus boolean DEFAULT false NOT NULL,
    teen_friendly boolean DEFAULT false NOT NULL,
    family_packages boolean DEFAULT false NOT NULL,
    babysitting_service boolean DEFAULT false NOT NULL,
    family_notes text,
    unique_specialties text,
    local_traditions text,
    experience_types text,
    skill_levels text,
    equipment_provided text,
    languages_spoken text,
    certifications text,
    awards text,
    wifi_available boolean DEFAULT false NOT NULL,
    pets_allowed boolean DEFAULT false NOT NULL,
    smoking_allowed boolean DEFAULT false NOT NULL,
    credit_cards_accepted boolean DEFAULT false NOT NULL,
    delivery_service boolean DEFAULT false NOT NULL,
    takeaway_service boolean DEFAULT false NOT NULL,
    reservations_required boolean DEFAULT false NOT NULL,
    group_bookings boolean DEFAULT false NOT NULL,
    private_events boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.partner_details OWNER TO neondb_owner;

--
-- Name: partner_details_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.partner_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_details_id_seq OWNER TO neondb_owner;

--
-- Name: partner_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.partner_details_id_seq OWNED BY public.partner_details.id;


--
-- Name: partner_offers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.partner_offers (
    id integer NOT NULL,
    partner_code text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    discount text NOT NULL,
    valid_until text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.partner_offers OWNER TO neondb_owner;

--
-- Name: partner_offers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.partner_offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_offers_id_seq OWNER TO neondb_owner;

--
-- Name: partner_offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.partner_offers_id_seq OWNED BY public.partner_offers.id;


--
-- Name: partner_onboarding; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.partner_onboarding (
    id integer NOT NULL,
    partner_code text NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp without time zone,
    business_info_completed boolean DEFAULT false NOT NULL,
    accessibility_info_completed boolean DEFAULT false NOT NULL,
    allergy_info_completed boolean DEFAULT false NOT NULL,
    family_info_completed boolean DEFAULT false NOT NULL,
    specialty_info_completed boolean DEFAULT false NOT NULL,
    services_info_completed boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.partner_onboarding OWNER TO neondb_owner;

--
-- Name: partner_onboarding_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.partner_onboarding_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_onboarding_id_seq OWNER TO neondb_owner;

--
-- Name: partner_onboarding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.partner_onboarding_id_seq OWNED BY public.partner_onboarding.id;


--
-- Name: purchased_packages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchased_packages (
    id integer NOT NULL,
    structure_code text NOT NULL,
    package_size integer NOT NULL,
    price text NOT NULL,
    iq_codes_remaining integer NOT NULL,
    iq_codes_used integer DEFAULT 0,
    purchase_date timestamp without time zone DEFAULT now(),
    payment_method text DEFAULT 'sumup'::text,
    payment_status text DEFAULT 'completed'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.purchased_packages OWNER TO neondb_owner;

--
-- Name: purchased_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.purchased_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchased_packages_id_seq OWNER TO neondb_owner;

--
-- Name: purchased_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.purchased_packages_id_seq OWNED BY public.purchased_packages.id;


--
-- Name: real_offers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.real_offers (
    id integer NOT NULL,
    partner_code text NOT NULL,
    partner_name text NOT NULL,
    title text NOT NULL,
    description text,
    discount_percentage integer NOT NULL,
    discount_type text DEFAULT 'percentage'::text,
    category text NOT NULL,
    location text,
    city text,
    province text,
    latitude text,
    longitude text,
    is_active boolean DEFAULT true,
    valid_from timestamp without time zone,
    valid_until timestamp without time zone,
    max_uses integer,
    current_uses integer DEFAULT 0,
    target_audience text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.real_offers OWNER TO neondb_owner;

--
-- Name: real_offers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.real_offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.real_offers_id_seq OWNER TO neondb_owner;

--
-- Name: real_offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.real_offers_id_seq OWNED BY public.real_offers.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    iq_code text NOT NULL,
    role text NOT NULL,
    session_token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO neondb_owner;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: settings_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.settings_config (
    id integer NOT NULL,
    structure_code text NOT NULL,
    structure_name text DEFAULT ''::text NOT NULL,
    owner_name text DEFAULT ''::text NOT NULL,
    contact_email text DEFAULT ''::text NOT NULL,
    contact_phone text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    province text DEFAULT ''::text NOT NULL,
    postal_code text DEFAULT ''::text NOT NULL,
    business_type text DEFAULT 'hotel'::text NOT NULL,
    checkin_time text DEFAULT '15:00'::text NOT NULL,
    checkout_time text DEFAULT '11:00'::text NOT NULL,
    max_guests_per_room integer DEFAULT 4 NOT NULL,
    welcome_message text DEFAULT 'Benvenuto nella nostra struttura!'::text NOT NULL,
    additional_services text DEFAULT ''::text NOT NULL,
    wifi_password text DEFAULT ''::text NOT NULL,
    emergency_contact text DEFAULT ''::text NOT NULL,
    tax_rate text DEFAULT '3.00'::text NOT NULL,
    default_currency text DEFAULT 'EUR'::text NOT NULL,
    language_preference text DEFAULT 'it'::text NOT NULL,
    notification_preferences text DEFAULT '{}'::text NOT NULL,
    backup_frequency text DEFAULT 'daily'::text NOT NULL,
    auto_logout_minutes integer DEFAULT 30 NOT NULL,
    enable_guest_portal boolean DEFAULT true NOT NULL,
    enable_whatsapp_integration boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings_config OWNER TO neondb_owner;

--
-- Name: settings_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.settings_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_config_id_seq OWNER TO neondb_owner;

--
-- Name: settings_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.settings_config_id_seq OWNED BY public.settings_config.id;


--
-- Name: structure_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.structure_settings (
    id integer NOT NULL,
    structure_code text NOT NULL,
    gestionale_unlocked_at timestamp without time zone DEFAULT now(),
    first_package_purchase timestamp without time zone,
    is_gestionale_blocked boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.structure_settings OWNER TO neondb_owner;

--
-- Name: structure_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.structure_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.structure_settings_id_seq OWNER TO neondb_owner;

--
-- Name: structure_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.structure_settings_id_seq OWNED BY public.structure_settings.id;


--
-- Name: temporary_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.temporary_codes (
    id integer NOT NULL,
    temp_code character varying(35) NOT NULL,
    structure_code character varying(20) NOT NULL,
    guest_name character varying(100),
    guest_phone character varying(20),
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.temporary_codes OWNER TO neondb_owner;

--
-- Name: temporary_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.temporary_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.temporary_codes_id_seq OWNER TO neondb_owner;

--
-- Name: temporary_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.temporary_codes_id_seq OWNED BY public.temporary_codes.id;


--
-- Name: accounting_movements id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounting_movements ALTER COLUMN id SET DEFAULT nextval('public.accounting_movements_id_seq'::regclass);


--
-- Name: admin_credits id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_credits ALTER COLUMN id SET DEFAULT nextval('public.admin_credits_id_seq'::regclass);


--
-- Name: assigned_packages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.assigned_packages ALTER COLUMN id SET DEFAULT nextval('public.assigned_packages_id_seq'::regclass);


--
-- Name: available_iq_codes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.available_iq_codes ALTER COLUMN id SET DEFAULT nextval('public.available_iq_codes_id_seq'::regclass);


--
-- Name: generated_emotional_codes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.generated_emotional_codes ALTER COLUMN id SET DEFAULT nextval('public.generated_emotional_codes_id_seq'::regclass);


--
-- Name: guests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guests ALTER COLUMN id SET DEFAULT nextval('public.guests_id_seq'::regclass);


--
-- Name: iq_codes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.iq_codes ALTER COLUMN id SET DEFAULT nextval('public.iq_codes_id_seq'::regclass);


--
-- Name: iqcode_recharges id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.iqcode_recharges ALTER COLUMN id SET DEFAULT nextval('public.iqcode_recharges_id_seq'::regclass);


--
-- Name: iqcode_recovery_keys id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.iqcode_recovery_keys ALTER COLUMN id SET DEFAULT nextval('public.iqcode_recovery_keys_id_seq'::regclass);


--
-- Name: one_time_codes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.one_time_codes ALTER COLUMN id SET DEFAULT nextval('public.one_time_codes_id_seq'::regclass);


--
-- Name: partner_details id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_details ALTER COLUMN id SET DEFAULT nextval('public.partner_details_id_seq'::regclass);


--
-- Name: partner_offers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_offers ALTER COLUMN id SET DEFAULT nextval('public.partner_offers_id_seq'::regclass);


--
-- Name: partner_onboarding id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_onboarding ALTER COLUMN id SET DEFAULT nextval('public.partner_onboarding_id_seq'::regclass);


--
-- Name: purchased_packages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchased_packages ALTER COLUMN id SET DEFAULT nextval('public.purchased_packages_id_seq'::regclass);


--
-- Name: real_offers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.real_offers ALTER COLUMN id SET DEFAULT nextval('public.real_offers_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: settings_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings_config ALTER COLUMN id SET DEFAULT nextval('public.settings_config_id_seq'::regclass);


--
-- Name: structure_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.structure_settings ALTER COLUMN id SET DEFAULT nextval('public.structure_settings_id_seq'::regclass);


--
-- Name: temporary_codes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.temporary_codes ALTER COLUMN id SET DEFAULT nextval('public.temporary_codes_id_seq'::regclass);


--
-- Data for Name: accounting_movements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.accounting_movements (id, structure_code, type, category, description, amount, movement_date, payment_method, clients_served, iqcodes_used, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_credits; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.admin_credits (id, admin_code, credits_remaining, credits_used, last_generated_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: assigned_packages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.assigned_packages (id, recipient_iq_code, package_size, status, assigned_by, assigned_at, credits_remaining, credits_used) FROM stdin;
\.


--
-- Data for Name: available_iq_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.available_iq_codes (id, code, structure_code, original_guest_id, original_guest_name, package_id, made_available_at, reason, created_at) FROM stdin;
\.


--
-- Data for Name: generated_emotional_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.generated_emotional_codes (id, code, generated_by, package_id, assigned_to, guest_id, country, emotional_word, status, generated_at, assigned_at, removed_at, removed_reason) FROM stdin;
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.guests (id, structure_code, first_name, last_name, email, phone, room_number, checkin_date, checkout_date, notes, assigned_codes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: iq_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.iq_codes (id, code, role, is_active, status, created_at, assigned_to, location, code_type, approved_at, approved_by, internal_note, is_deleted, deleted_at, available_one_time_uses) FROM stdin;
1	TIQ-IT-ADMIN	admin	t	pending	2025-07-09 09:04:07.486	\N	\N	\N	\N	\N	\N	f	\N	10
2	TIQ-VV-STT-9576	structure	t	pending	2025-07-09 09:04:08.355	\N	\N	\N	\N	\N	\N	f	\N	10
3	TIQ-RC-STT-4334	structure	t	pending	2025-07-09 09:04:08.854	\N	\N	\N	\N	\N	\N	f	\N	10
4	TIQ-CS-STT-7541	structure	t	pending	2025-07-09 09:04:10.631	\N	\N	\N	\N	\N	\N	f	\N	10
5	TIQ-VV-STT-0700	structure	t	pending	2025-07-09 09:04:10.818	\N	\N	\N	\N	\N	\N	f	\N	10
6	TIQ-VV-PRT-4897	partner	t	pending	2025-07-09 09:04:40.845	\N	\N	\N	\N	\N	\N	f	\N	10
7	TIQ-RC-PRT-8654	partner	t	pending	2025-07-09 09:04:40.906	\N	\N	\N	\N	\N	\N	f	\N	10
8	IQCODE-PRIMOACCESSO-UEU6H	tourist	f	approved	2025-07-09 09:05:50.62	luca	IT	temporary	\N	\N	\N	f	\N	10
9	IQ-IT-3200-TORRE	tourist	t	approved	2025-07-09 09:06:11.866	Turista TouristIQ	IT	emotional	\N	\N	\N	f	\N	10
\.


--
-- Data for Name: iqcode_recharges; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.iqcode_recharges (id, validation_id, tourist_iq_code, status, sumup_payment_id, requested_at, confirmed_at, activated_at, admin_note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: iqcode_recovery_keys; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.iqcode_recovery_keys (id, hashed_iqcode, hashed_secret_word, hashed_birth_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: one_time_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.one_time_codes (id, code, tourist_iq_code, is_used, used_by, used_by_name, created_at, used_at) FROM stdin;
1	55115	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
2	61018	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
3	24582	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
4	80992	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
5	49349	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
6	78957	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
7	31485	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
8	46152	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
9	29415	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
10	87237	IQ-IT-3200-TORRE	f	\N	\N	2025-07-09 09:06:11.943584	\N
\.


--
-- Data for Name: partner_details; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.partner_details (id, partner_code, business_name, business_type, description, address, city, province, phone, email, website, opening_hours, seasonal_hours, wheelchair_accessible, ramp_width, ramp_slope, elevator_access, accessible_bathroom, parking_spaces, accessible_parking, assistance_available, accessibility_notes, gluten_free, gluten_free_kitchen, dairy_free, nut_free, vegetarian_options, vegan_options, halal_certified, kosher_certified, allergy_training, allergy_menu, allergy_notes, child_friendly, high_chairs, kids_menu, changing_table, play_area, baby_friendly, toddler_friendly, child_friendly_6plus, teen_friendly, family_packages, babysitting_service, family_notes, unique_specialties, local_traditions, experience_types, skill_levels, equipment_provided, languages_spoken, certifications, awards, wifi_available, pets_allowed, smoking_allowed, credit_cards_accepted, delivery_service, takeaway_service, reservations_required, group_bookings, private_events, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: partner_offers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.partner_offers (id, partner_code, title, description, discount, valid_until, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: partner_onboarding; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.partner_onboarding (id, partner_code, is_completed, completed_at, business_info_completed, accessibility_info_completed, allergy_info_completed, family_info_completed, specialty_info_completed, services_info_completed, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchased_packages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchased_packages (id, structure_code, package_size, price, iq_codes_remaining, iq_codes_used, purchase_date, payment_method, payment_status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: real_offers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.real_offers (id, partner_code, partner_name, title, description, discount_percentage, discount_type, category, location, city, province, latitude, longitude, is_active, valid_from, valid_until, max_uses, current_uses, target_audience, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (id, iq_code, role, session_token, expires_at, created_at) FROM stdin;
1	TIQ-IT-ADMIN	admin	cRMvRC-fGtDhC4LNCwc5m	2025-07-10 09:04:32.832	2025-07-09 09:04:32.833
2	IQ-IT-3200-TORRE	tourist	Tuy3ls8_OqjFW3lPUOFei	2025-07-10 09:06:11.981	2025-07-09 09:06:11.981
3	TIQ-IT-ADMIN	admin	taTZvyJaYYL2BUEt8W9ox	2025-07-10 11:32:31.562	2025-07-09 11:32:31.562
4	IQ-IT-3200-TORRE	tourist	cWSjMLL5Wg48Uqbo5bCDQ	2025-07-10 11:32:55.724	2025-07-09 11:32:55.724
5	IQ-IT-3200-TORRE	tourist	pFk_cQ-f3o05PkamybtLq	2025-07-10 14:35:21.048	2025-07-09 14:35:21.048
6	IQ-IT-3200-TORRE	tourist	Ydpx3RcubjhlRWqBN_Ko7	2025-07-10 14:35:29.712	2025-07-09 14:35:29.712
\.


--
-- Data for Name: settings_config; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.settings_config (id, structure_code, structure_name, owner_name, contact_email, contact_phone, address, city, province, postal_code, business_type, checkin_time, checkout_time, max_guests_per_room, welcome_message, additional_services, wifi_password, emergency_contact, tax_rate, default_currency, language_preference, notification_preferences, backup_frequency, auto_logout_minutes, enable_guest_portal, enable_whatsapp_integration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: structure_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.structure_settings (id, structure_code, gestionale_unlocked_at, first_package_purchase, is_gestionale_blocked, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: temporary_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.temporary_codes (id, temp_code, structure_code, guest_name, guest_phone, used_at, created_at) FROM stdin;
\.


--
-- Name: accounting_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.accounting_movements_id_seq', 1, false);


--
-- Name: admin_credits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.admin_credits_id_seq', 1, false);


--
-- Name: assigned_packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.assigned_packages_id_seq', 1, true);


--
-- Name: available_iq_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.available_iq_codes_id_seq', 1, false);


--
-- Name: generated_emotional_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.generated_emotional_codes_id_seq', 1, false);


--
-- Name: guests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.guests_id_seq', 1, false);


--
-- Name: iq_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.iq_codes_id_seq', 9, true);


--
-- Name: iqcode_recharges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.iqcode_recharges_id_seq', 1, false);


--
-- Name: iqcode_recovery_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.iqcode_recovery_keys_id_seq', 1, false);


--
-- Name: one_time_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.one_time_codes_id_seq', 10, true);


--
-- Name: partner_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.partner_details_id_seq', 1, false);


--
-- Name: partner_offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.partner_offers_id_seq', 1, false);


--
-- Name: partner_onboarding_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.partner_onboarding_id_seq', 1, false);


--
-- Name: purchased_packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.purchased_packages_id_seq', 1, false);


--
-- Name: real_offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.real_offers_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sessions_id_seq', 6, true);


--
-- Name: settings_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.settings_config_id_seq', 1, false);


--
-- Name: structure_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.structure_settings_id_seq', 1, false);


--
-- Name: temporary_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.temporary_codes_id_seq', 1, false);


--
-- Name: accounting_movements accounting_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounting_movements
    ADD CONSTRAINT accounting_movements_pkey PRIMARY KEY (id);


--
-- Name: admin_credits admin_credits_admin_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_credits
    ADD CONSTRAINT admin_credits_admin_code_unique UNIQUE (admin_code);


--
-- Name: admin_credits admin_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_credits
    ADD CONSTRAINT admin_credits_pkey PRIMARY KEY (id);


--
-- Name: assigned_packages assigned_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.assigned_packages
    ADD CONSTRAINT assigned_packages_pkey PRIMARY KEY (id);


--
-- Name: available_iq_codes available_iq_codes_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.available_iq_codes
    ADD CONSTRAINT available_iq_codes_code_unique UNIQUE (code);


--
-- Name: available_iq_codes available_iq_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.available_iq_codes
    ADD CONSTRAINT available_iq_codes_pkey PRIMARY KEY (id);


--
-- Name: generated_emotional_codes generated_emotional_codes_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.generated_emotional_codes
    ADD CONSTRAINT generated_emotional_codes_code_unique UNIQUE (code);


--
-- Name: generated_emotional_codes generated_emotional_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.generated_emotional_codes
    ADD CONSTRAINT generated_emotional_codes_pkey PRIMARY KEY (id);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: iq_codes iq_codes_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.iq_codes
    ADD CONSTRAINT iq_codes_code_unique UNIQUE (code);


--
-- Name: iq_codes iq_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.iq_codes
    ADD CONSTRAINT iq_codes_pkey PRIMARY KEY (id);


--
-- Name: iqcode_recharges iqcode_recharges_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.iqcode_recharges
    ADD CONSTRAINT iqcode_recharges_pkey PRIMARY KEY (id);


--
-- Name: iqcode_recovery_keys iqcode_recovery_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.iqcode_recovery_keys
    ADD CONSTRAINT iqcode_recovery_keys_pkey PRIMARY KEY (id);


--
-- Name: one_time_codes one_time_codes_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.one_time_codes
    ADD CONSTRAINT one_time_codes_code_unique UNIQUE (code);


--
-- Name: one_time_codes one_time_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.one_time_codes
    ADD CONSTRAINT one_time_codes_pkey PRIMARY KEY (id);


--
-- Name: partner_details partner_details_partner_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_details
    ADD CONSTRAINT partner_details_partner_code_unique UNIQUE (partner_code);


--
-- Name: partner_details partner_details_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_details
    ADD CONSTRAINT partner_details_pkey PRIMARY KEY (id);


--
-- Name: partner_offers partner_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_offers
    ADD CONSTRAINT partner_offers_pkey PRIMARY KEY (id);


--
-- Name: partner_onboarding partner_onboarding_partner_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_onboarding
    ADD CONSTRAINT partner_onboarding_partner_code_unique UNIQUE (partner_code);


--
-- Name: partner_onboarding partner_onboarding_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_onboarding
    ADD CONSTRAINT partner_onboarding_pkey PRIMARY KEY (id);


--
-- Name: purchased_packages purchased_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchased_packages
    ADD CONSTRAINT purchased_packages_pkey PRIMARY KEY (id);


--
-- Name: real_offers real_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.real_offers
    ADD CONSTRAINT real_offers_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_session_token_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_session_token_unique UNIQUE (session_token);


--
-- Name: settings_config settings_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings_config
    ADD CONSTRAINT settings_config_pkey PRIMARY KEY (id);


--
-- Name: settings_config settings_config_structure_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings_config
    ADD CONSTRAINT settings_config_structure_code_unique UNIQUE (structure_code);


--
-- Name: structure_settings structure_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.structure_settings
    ADD CONSTRAINT structure_settings_pkey PRIMARY KEY (id);


--
-- Name: structure_settings structure_settings_structure_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.structure_settings
    ADD CONSTRAINT structure_settings_structure_code_unique UNIQUE (structure_code);


--
-- Name: temporary_codes temporary_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.temporary_codes
    ADD CONSTRAINT temporary_codes_pkey PRIMARY KEY (id);


--
-- Name: temporary_codes temporary_codes_temp_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.temporary_codes
    ADD CONSTRAINT temporary_codes_temp_code_unique UNIQUE (temp_code);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

