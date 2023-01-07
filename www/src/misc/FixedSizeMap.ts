import _ from "lodash";
import { MapHelper } from "./ArrayUtils";

export class FixedSizeMap<K, V> {
  protected map: Map<K, V>;
  protected usage: Map<K, number>;
  protected capacity: number;
  protected timer: number;

  private constructor(
    map: Map<K, V>,
    usage: Map<K, number>,
    capacity: number,
    timer: number
  ) {
    this.map = map;
    this.usage = usage;
    this.capacity = capacity;
    this.timer = 0;
  }

  public static withCapacity<K, V>(capacity: number): FixedSizeMap<K, V> {
    return new FixedSizeMap<K, V>(new Map(), new Map(), capacity, 0);
  }

  public get(key: K): V | undefined {
    return this.map.get(key);
  }

  public set(key: K, value: V) {
    if (this.map.get(key) === value) {
      // nothing change
      return this;
    }

    const timer = this.timer + 1;
    const map = MapHelper.set(this.map, key, value);
    const usage = MapHelper.set(this.usage, key, timer);

    if (map.size > this.capacity) {
      // evict least used keys
      const evictedKeys = _.sortBy(Array.from(usage.entries()), (o) => o[1])
        .map((o) => o[0])
        .slice(0, map.size - this.capacity);
      evictedKeys.forEach((key) => {
        map.delete(key);
        usage.delete(key);
      });
    }

    return new FixedSizeMap(map, usage, this.capacity, timer);
  }
}
