/**
 * Platform Core Layer - Event Bus
 * Lightweight in-process event bus with future expansion capability
 */

import { ulid } from 'ulid';
import { RequestContext } from '../context';
import {
  DomainEvent,
  EventHandler,
  EventSubscription,
  EventMetadata,
  EventPriority,
  EventType,
} from './types';

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventQueue: DomainEvent[] = [];
  private isProcessing = false;

  /**
   * Subscribe to an event type
   */
  subscribe<T>(
    eventType: EventType | string,
    handler: (event: DomainEvent<T>) => Promise<void>,
    options?: { priority?: EventPriority; retries?: number }
  ): string {
    const subscriptionId = `sub_${ulid()}`;

    const eventHandler: EventHandler<T> = {
      eventType,
      handle: handler,
      priority: options?.priority || 'normal',
      retries: options?.retries || 3,
    };

    const handlers = this.handlers.get(eventType) || [];
    handlers.push(eventHandler as EventHandler);
    this.handlers.set(eventType, handlers);

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      eventType,
      handler: eventHandler as EventHandler,
      active: true,
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    const handlers = this.handlers.get(subscription.eventType);
    if (handlers) {
      const index = handlers.indexOf(subscription.handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }

    this.subscriptions.delete(subscriptionId);
    return true;
  }

  /**
   * Publish an event
   */
  async publish<T>(
    eventType: EventType | string,
    payload: T,
    options?: {
      aggregateId?: string;
      aggregateType?: string;
      priority?: EventPriority;
      causationId?: string;
    }
  ): Promise<string> {
    const context = RequestContext.get();

    const metadata: EventMetadata = {
      traceId: context?.traceId ?? null,
      correlationId: context?.correlationId ?? null,
      causationId: options?.causationId ?? null,
      source: 'veterinary-erp-api',
      priority: options?.priority || 'normal',
    };

    const event: DomainEvent<T> = {
      id: `evt_${ulid()}`,
      type: eventType,
      aggregateId: options?.aggregateId || '',
      aggregateType: options?.aggregateType || eventType.split('.')[0],
      tenantId: context?.tenantId ?? null,
      userId: context?.userId ?? null,
      payload,
      metadata,
      timestamp: new Date(),
      version: 1,
    };

    this.eventQueue.push(event as DomainEvent);
    this.processQueue();

    return event.id;
  }

  /**
   * Publish and wait for all handlers to complete
   */
  async publishAndWait<T>(
    eventType: EventType | string,
    payload: T,
    options?: {
      aggregateId?: string;
      aggregateType?: string;
      priority?: EventPriority;
    }
  ): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];

    const context = RequestContext.get();
    const event: DomainEvent<T> = {
      id: `evt_${ulid()}`,
      type: eventType,
      aggregateId: options?.aggregateId || '',
      aggregateType: options?.aggregateType || eventType.split('.')[0],
      tenantId: context?.tenantId ?? null,
      userId: context?.userId ?? null,
      payload,
      metadata: {
        traceId: context?.traceId ?? null,
        correlationId: context?.correlationId ?? null,
        causationId: null,
        source: 'veterinary-erp-api',
        priority: options?.priority || 'normal',
      },
      timestamp: new Date(),
      version: 1,
    };

    await Promise.all(
      handlers.map((handler) =>
        handler.handle(event as DomainEvent).catch((error) => {
          console.error(`Event handler error for ${eventType}:`, error);
        })
      )
    );
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      const handlers = this.handlers.get(event.type) || [];

      for (const handler of handlers) {
        try {
          await handler.handle(event);
        } catch (error) {
          console.error(`Event handler error for ${event.type}:`, error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Clear all handlers (for testing)
   */
  clear(): void {
    this.handlers.clear();
    this.subscriptions.clear();
    this.eventQueue = [];
  }
}

export const eventBus = new EventBus();
export default eventBus;
