using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChibiDink.Infrastructure.Persistence.Migrations
{
    /// <summary>The chibi kid becomes the Paddle Knight: hair, skin and headwear go; body, face and handle options arrive.</summary>
    public partial class PaddleKnight : Migration
    {
        private const string Table = "PlayerProfiles";

        private static readonly (string Column, int Length, string Default)[] Added =
        [
            ("Appearance_BodyColor", 7, "#F2A65A"),
            ("Appearance_EdgeColor", 7, "#1F2A37"),
            ("Appearance_GripColor", 7, "#2E333E"),
            ("Appearance_BrowStyle", 16, "soft"),
            ("Appearance_CheekStyle", 16, "blush"),
            ("Appearance_FaceMark", 16, "none"),
            ("Appearance_GripWrap", 16, "diagonal"),
            ("Appearance_HandleShape", 16, "classic"),
            ("Appearance_EndCap", 16, "round"),
        ];

        private static readonly (string Column, int Length, string Default)[] Removed =
        [
            ("Appearance_SkinTone", 7, "#F5C9A6"),
            ("Appearance_HairStyle", 16, "spiky"),
            ("Appearance_HairColor", 7, "#6B4226"),
            ("Appearance_HeadwearStyle", 16, "headband"),
            ("Appearance_HeadwearColor", 7, "#FFFFFF"),
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var (column, _, _) in Removed)
                migrationBuilder.DropColumn(name: column, table: Table);

            foreach (var (column, length, value) in Added)
                migrationBuilder.AddColumn<string>(
                    name: column, table: Table, type: $"character varying({length})", maxLength: length, nullable: false, defaultValue: value);

            // Old face choices that the knight doesn't have map to the closest new one.
            migrationBuilder.Sql("""
                UPDATE "PlayerProfiles" SET "Appearance_EyeStyle" = CASE "Appearance_EyeStyle"
                    WHEN 'bold' THEN 'round' WHEN 'cool' THEN 'sleepy' ELSE "Appearance_EyeStyle" END;
                UPDATE "PlayerProfiles" SET "Appearance_MouthStyle" = CASE "Appearance_MouthStyle"
                    WHEN 'smile' THEN 'smirk' WHEN 'open' THEN 'wow' ELSE "Appearance_MouthStyle" END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "PlayerProfiles" SET "Appearance_EyeStyle" = CASE "Appearance_EyeStyle"
                    WHEN 'round' THEN 'bold' WHEN 'sleepy' THEN 'cool' WHEN 'star' THEN 'sparkle' ELSE "Appearance_EyeStyle" END;
                UPDATE "PlayerProfiles" SET "Appearance_MouthStyle" = CASE "Appearance_MouthStyle"
                    WHEN 'wow' THEN 'open' WHEN 'blep' THEN 'grin' WHEN 'flat' THEN 'smile' ELSE "Appearance_MouthStyle" END;
                """);

            foreach (var (column, _, _) in Added)
                migrationBuilder.DropColumn(name: column, table: Table);

            foreach (var (column, length, value) in Removed)
                migrationBuilder.AddColumn<string>(
                    name: column, table: Table, type: $"character varying({length})", maxLength: length, nullable: false, defaultValue: value);
        }
    }
}
