using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Cosmetics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Appearance_PaddleColor",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "Appearance_ShirtColor",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "Appearance_ShortsColor",
                table: "PlayerProfiles");

            migrationBuilder.AddColumn<int>(
                name: "Coins",
                table: "PlayerProfiles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Loadout_EffectId",
                table: "PlayerProfiles",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Loadout_OutfitId",
                table: "PlayerProfiles",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "basic-set"); // existing players start with the starter outfit

            migrationBuilder.AddColumn<string>(
                name: "Loadout_PaddleId",
                table: "PlayerProfiles",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "starter-paddle"); // and the starter paddle

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "PlayerProfiles",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.CreateTable(
                name: "PlayerInventory",
                columns: table => new
                {
                    ItemId = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcquiredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerInventory", x => new { x.UserId, x.ItemId });
                    table.ForeignKey(
                        name: "FK_PlayerInventory_PlayerProfiles_UserId",
                        column: x => x.UserId,
                        principalTable: "PlayerProfiles",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RewardTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Currency = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Amount = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    SourceKey = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    At = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RewardTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RewardTransactions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RewardTransactions_UserId_Currency_SourceKey",
                table: "RewardTransactions",
                columns: new[] { "UserId", "Currency", "SourceKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlayerInventory");

            migrationBuilder.DropTable(
                name: "RewardTransactions");

            migrationBuilder.DropColumn(
                name: "Coins",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "Loadout_EffectId",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "Loadout_OutfitId",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "Loadout_PaddleId",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "PlayerProfiles");

            migrationBuilder.AddColumn<string>(
                name: "Appearance_PaddleColor",
                table: "PlayerProfiles",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Appearance_ShirtColor",
                table: "PlayerProfiles",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Appearance_ShortsColor",
                table: "PlayerProfiles",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "");
        }
    }
}
