extends Node3D

const REST_POS := Vector3(0.22, -0.3, -0.33)
const MOUTH_POS := Vector3(0.06, -0.17, -0.38)

@onready var hand_group: Node3D = $RightHandGroup
@onready var smoke: GPUParticles3D = $RightHandGroup/SmokeParticles

var smoking := false

func _ready() -> void:
	hand_group.position = REST_POS
	smoke.emitting = false

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_C and not smoking:
		_smoke_cigarette()

func _smoke_cigarette() -> void:
	smoking = true
	var tw := create_tween()
	tw.tween_property(hand_group, "position", MOUTH_POS, 0.5).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tw.tween_callback(func(): smoke.emitting = true)
	tw.tween_interval(1.0)
	tw.tween_property(hand_group, "position", REST_POS, 0.6).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
	tw.tween_callback(func(): smoking = false)
