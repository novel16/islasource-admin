import { Icon } from "./ui/icon";

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Icon name="fish" size={29} />
      </div>
      <div>
        IslaSource<span>SEAFOODS</span>
      </div>
    </div>
  );
}
