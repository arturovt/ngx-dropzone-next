export function preventDefault(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}
