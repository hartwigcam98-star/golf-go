using System;
using UnityEngine;
using UnityEngine.EventSystems;

/* Fires the moment a finger touches the button, not when it lifts (a Unity Button's click waits for the release, which landed
   the swing's last tap ~0.1 s late, past the bottom of the meter: every shot a mishit). The web game reacts on touch-down too.
   onRelease: the finger lifts or slides off (the aim arrows turn the aim while held, as the web's pointerup/leave/cancel). */
public class PressHandler : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
{
    public Action onPress, onRelease;
    bool down;
    public void OnPointerDown(PointerEventData e) { down = true; onPress?.Invoke(); }
    public void OnPointerUp(PointerEventData e) { if (down) { down = false; onRelease?.Invoke(); } }
    public void OnPointerExit(PointerEventData e) { if (down) { down = false; onRelease?.Invoke(); } }
}
