import type { Visual } from "pbirkit/schemas/visual/2.13.0";

import { color, font, shape, size } from "#/design.ts";
import type { Field } from "#/lib/frame.ts";
import { group } from "#/lib/group.ts";
import { inset } from "#/lib/layout.ts";
import type { Rect } from "#/lib/layout.ts";
import { rect } from "./shape.ts";
import { dynamicText } from "./text.ts";

const PADDING = 20;
const TITLE_HEIGHT = 44;
const LINE_HEIGHT = 22;
const MAX_LINES = 2;

export const PROFILE_CARD_HEIGHT = 2 * PADDING + TITLE_HEIGHT + 4 + MAX_LINES * LINE_HEIGHT;

export interface ProfileCardProps {
	readonly at: Rect;
	readonly title: Field;
	readonly details: ReadonlyArray<Field>;
}

export const profileCard = ({ at, title, details }: ProfileCardProps): Array<Visual> => {
	if (details.length > MAX_LINES)
		throw new RangeError(`profileCard: at most ${MAX_LINES} detail lines, got ${details.length}`);
	const inner = inset(at, PADDING);
	const firstLine = inner.y + TITLE_HEIGHT + 4;
	return group("profile", "Profile", [
		rect({ name: "profile-card", label: "Card background", at, fill: color.surface, radius: shape.radius }),
		rect({
			name: "profile-accent",
			label: "Accent bar",
			at: { x: at.x, y: inner.y + 4, width: 3, height: TITLE_HEIGHT - 8 },
			fill: color.accent,
		}),
		dynamicText({
			name: "profile-title",
			label: "Name",
			at: { ...inner, height: TITLE_HEIGHT },
			value: title,
			font: font.display,
			size: size.pageTitle,
			color: color.ink,
			background: color.surface,
		}),
		...details.map((detail, index) =>
			dynamicText({
				name: `profile-detail-${index + 1}`,
				label: `Detail ${index + 1}`,
				at: { ...inner, y: firstLine + index * LINE_HEIGHT, height: LINE_HEIGHT },
				value: detail,
				size: size.subtitle,
				color: color.inkMuted,
				background: color.surface,
			}),
		),
	]);
};
