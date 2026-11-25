using System;
using UnityEngine;
using UnityEngine.EventSystems;

/* Fires the moment a finger touches the button, not when it lifts (a Unity Button's click waits for the release, which landed
   the swing's last tap ~0.1 s late, past the bottom of the meter: every shot a mishit). The web game reacts on touch-down too. */
public class PressHandler : MonoBehaviour, IPointerDownHandler
{
    public Action onPress;
    public void OnPointerDown(PointerEventData e) { onPress?.Invoke(); }
}
