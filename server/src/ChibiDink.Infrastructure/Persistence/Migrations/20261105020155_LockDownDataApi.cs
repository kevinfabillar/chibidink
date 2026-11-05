using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Supabase publishes tables in the "public" schema through its own web API (the Data API) to
    /// its "anon" and "authenticated" roles. ChibiDink never uses that API, and these tables hold
    /// emails, password hashes and the keys that sign logins, so: turn on row-level security for every
    /// table (no policies = no rows for those roles) and take away their access, now and for new tables.
    /// ChibiDink connects as the tables' owner, which isn't affected. On plain PostgreSQL (no Supabase
    /// roles) only the row-level security part runs.
    /// </summary>
    public partial class LockDownDataApi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                DECLARE t record;
                BEGIN
                    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
                        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
                    END LOOP;

                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
                        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
                        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
                        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
                    END IF;
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
                        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
                        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
                        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
                    END IF;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                DECLARE t record;
                BEGIN
                    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
                        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
                    END LOOP;
                END $$;
                """);
        }
    }
}
