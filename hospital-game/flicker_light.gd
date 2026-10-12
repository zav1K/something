extends OmniLight3D

var base_energy := 2.0
var t := 0.0

func _process(delta: float) -> void:
	t += delta
	var flicker := 0.85 + 0.15 * sin(t * 37.0) + 0.1 * sin(t * 91.0)
	var dropout := 1.0
	if randf() < 0.01:
		dropout = 0.2
	light_energy = base_energy * clamp(flicker, 0.3, 1.2) * dropout
