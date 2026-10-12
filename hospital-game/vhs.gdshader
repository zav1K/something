shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
uniform float scanline_intensity : hint_range(0.0, 1.0) = 0.25;
uniform float noise_intensity : hint_range(0.0, 1.0) = 0.12;
uniform float aberration_amount : hint_range(0.0, 0.02) = 0.004;
uniform float vignette_strength : hint_range(0.0, 2.0) = 0.9;

float rand(vec2 co) {
	return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
	vec2 uv = SCREEN_UV;

	float band = step(0.995, rand(vec2(floor(uv.y * 40.0), floor(TIME * 6.0))));
	uv.x += band * (rand(vec2(TIME, uv.y)) - 0.5) * 0.05;

	float ab = aberration_amount;
	vec3 col;
	col.r = texture(SCREEN_TEXTURE, clamp(uv + vec2(ab, 0.0), 0.0, 1.0)).r;
	col.g = texture(SCREEN_TEXTURE, clamp(uv, 0.0, 1.0)).g;
	col.b = texture(SCREEN_TEXTURE, clamp(uv - vec2(ab, 0.0), 0.0, 1.0)).b;

	float scan = sin(uv.y * 800.0) * 0.5 + 0.5;
	col *= 1.0 - scanline_intensity * scan;

	float n = rand(uv * (TIME + 1.0));
	col += (n - 0.5) * noise_intensity;

	float vig = distance(uv, vec2(0.5));
	col *= 1.0 - vig * vignette_strength;

	COLOR = vec4(col, 1.0);
}
