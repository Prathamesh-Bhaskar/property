// src/cache/redisClient.ts
import Redis from 'ioredis';
import 'dotenv/config'
import { error } from 'console';

class RedisClient {
    private client: Redis | null = null;
    private static instance: RedisClient;

    private constructor() { }

    public static getInstance(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    public async connect(): Promise<void> {
        try {
            const redisUrl = process.env.REDIS_URL
            if(!redisUrl)
            {
                throw error
            }

            this.client = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                reconnectOnError: (err) => {
                    const targetError = 'READONLY';
                    return err.message.includes(targetError);
                },
            });

            // Test connection
            await this.client.ping();
            console.log('Redis connected successfully');

            // Handle connection events
            this.client.on('error', (error) => {
                console.error('Redis connection error:', error);
            });

            this.client.on('connect', () => {
                console.log('Redis client connected');
            });

            this.client.on('reconnecting', () => {
                console.log('Redis client reconnecting...');
            });

        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            // Don't throw error - allow app to continue without Redis
        }
    }

    public getClient(): Redis | null {
        return this.client;
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.disconnect();
            this.client = null;
        }
    }

    public isConnected(): boolean {
        return this.client !== null && this.client.status === 'ready';
    }
}

export const redisClient = RedisClient.getInstance();