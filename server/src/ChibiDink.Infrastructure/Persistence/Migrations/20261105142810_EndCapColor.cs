using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EndCapColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Appearance_EndCapColor",
                table: "PlayerProfiles",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "#1A1D24"); // existing players keep the dark cap they had
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Appearance_EndCapColor",
                table: "PlayerProfiles");
        }
    }
}
