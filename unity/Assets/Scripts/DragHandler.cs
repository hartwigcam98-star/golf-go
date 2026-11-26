using System;
using UnityEngine;
using UnityEngine.EventSystems;

// a touch that is followed while it moves (the web game's pointerdown + pointermove with pointer capture): reports the screen position
public class DragHandler : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler, IBeginDragHandler
{
    public Action<Vector2> onMove; public Action onEnd;
    public void OnPointerDown(PointerEventData e) => onMove?.Invoke(e.position);
    public void OnBeginDrag(PointerEventData e) { }
    public void OnDrag(PointerEventData e) => onMove?.Invoke(e.position);
    public void OnPointerUp(PointerEventData e) => onEnd?.Invoke();
}
