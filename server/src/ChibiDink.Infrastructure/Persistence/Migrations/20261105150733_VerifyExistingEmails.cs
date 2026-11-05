using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// New accounts now confirm their email before signing in. Accounts made before that count as confirmed,
    /// so nobody already playing gets locked out.
    /// </summary>
    public partial class VerifyExistingEmails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""UPDATE "AspNetUsers" SET "EmailConfirmed" = true WHERE "EmailConfirmed" = false;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nothing to undo: confirmed accounts stay confirmed.
        }
    }
}
