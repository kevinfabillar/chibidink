using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NoDeuceDefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // No deuce is the new default: sessions still going switch to first-to-11 wins (11–10 ends it).
            migrationBuilder.Sql("""UPDATE "PlaySessions" SET "Settings_WinBy" = 1 WHERE "Status" <> 'Closed';""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
