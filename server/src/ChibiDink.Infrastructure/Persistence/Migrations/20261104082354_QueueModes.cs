using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class QueueModes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Settings_Mode",
                table: "PlaySessions",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "FairMatch"); // existing sessions keep equal-play rotation
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Settings_Mode",
                table: "PlaySessions");
        }
    }
}
