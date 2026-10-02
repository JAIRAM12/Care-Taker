import { z } from "zod";
export const objectIdSchema=z.string().regex(/^[a-f\d]{24}$/i,"Expected a MongoDB ObjectId");
export const serviceRequestSchema=z.object({serviceId:objectIdSchema,location:z.string().trim().min(4).max(300),preferredDate:z.string().datetime(),preferredTime:z.string().min(3).max(40),durationHours:z.coerce.number().int().min(1).max(24),requiredSkills:z.array(z.string().max(60)).max(20).default([]),preferences:z.string().max(1000).optional(),notes:z.string().max(2000).optional()});
