using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FaceOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Appearance_EyeColor",
                table: "PlayerProfiles",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "#9A4E17");

            migrationBuilder.AddColumn<string>(
                name: "Appearance_EyeStyle",
                table: "PlayerProfiles",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "sparkle");

            migrationBuilder.AddColumn<string>(
                name: "Appearance_MouthStyle",
                table: "PlayerProfiles",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "grin");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Appearance_EyeColor",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "Appearance_EyeStyle",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "Appearance_MouthStyle",
                table: "PlayerProfiles");
        }
    }
}
