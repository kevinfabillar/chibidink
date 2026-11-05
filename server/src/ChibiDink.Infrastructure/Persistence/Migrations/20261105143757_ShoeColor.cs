using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ShoeColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Appearance_ShoeColor",
                table: "PlayerProfiles",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Appearance_ShoeColor",
                table: "PlayerProfiles");
        }
    }
}
