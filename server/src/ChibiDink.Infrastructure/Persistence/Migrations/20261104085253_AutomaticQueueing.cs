using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AutomaticQueueing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Automatic queueing: no more accepting match calls in any session.
            migrationBuilder.Sql("""UPDATE "PlaySessions" SET "Settings_ConfirmationWindowSeconds" = 0;""");
            // Calls still waiting for an answer go straight into play.
            migrationBuilder.Sql("""UPDATE "Matches" SET "Status" = 'Playing', "StartedAt" = now(), "ConfirmationDeadline" = NULL WHERE "IsActive" AND "Status" IN ('AwaitingConfirmation', 'Ready');""");
            migrationBuilder.Sql("""UPDATE "MatchParticipants" mp SET "Confirmation" = 'Accepted' FROM "Matches" m WHERE mp."MatchId" = m."Id" AND m."IsActive";""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
