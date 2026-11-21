export function handleDialogCancel(
  event: Pick<Event, "preventDefault">,
  onClose: () => void,
): void {
  event.preventDefault();
  onClose();
}
