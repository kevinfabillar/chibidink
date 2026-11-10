using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class KudosConfirmedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ConfirmedAt",
                table: "Kudos",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConfirmedAt",
                table: "Kudos");
        }
    }
}
