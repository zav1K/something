extends Node3D

@onready var anim_player: AnimationPlayer = find_child("AnimationPlayer", true, false)

var smoking := false

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_C and not smoking:
		_smoke_cigarette()

func _smoke_cigarette() -> void:
	smoking = true
	var anim_name := anim_player.get_animation_list()[0]
	anim_player.play(anim_name)
	await get_tree().create_timer(1.0).timeout
	var smoke: GPUParticles3D = find_child("SmokeParticles", true, false)
	smoke.emitting = true
	await anim_player.animation_finished
	smoking = false
