using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class KudosConfirm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Locked",
                table: "Kudos",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Locked",
                table: "Kudos");
        }
    }
}
