# Mapbox Cost Optimization for Unsigned Users

## Current Situation Analysis

Your app currently uses Mapbox for:

1. **Place Search** (`getSuggestions`, `retrieve`) - Session-based billing (free with session token)
2. **Reverse Geocoding** (`searchBoxReverseGeocode`) - Session-based billing
3. **Directions API** (`fetchRoute`) - Costs money per route request
4. **Map Rendering** (Mapbox GL) - No API costs (client-side)

**Key Issue**: The Directions API call in `/api/trpc/routes.ts` is called by ANYONE who adds waypoints, and it incurs costs immediately for both signed-in and unsigned users.

---

## Strategy Options for Cost Control

### **Option 1: Request Quotas + Demo Mode (RECOMMENDED)**

**Approach**: Allow unsigned users a limited number of free API calls per session/day before requiring sign-in.

**Implementation**:

- Track requests per session (IP + session token) in-memory or Redis cache
- Allow 3-5 free route calculations before requiring authentication
- After quota hit, show friendly modal: "Sign in to continue planning routes"
- Signed-in users get unlimited requests

**Pros**:

- Users can fully explore the app functionality
- Low implementation complexity
- Clear upgrade path
- Works well for product discovery

**Cons**:

- Requires session tracking infrastructure (simple for MVP, but adds complexity)
- Determined users could potentially reset sessions

**Cost Impact**: ~40% reduction (5 free calls per user, then conversion to sign-up)

**Implementation Effort**: Medium (2-3 hours)

---

### **Option 2: Disable Mapbox Routing for Unsigned Users Only**

**Approach**: Only allow signed-in users to calculate routes; unsigned users can search and build waypoint lists but can't see the route.

**Implementation**:

- Add auth check in `fetchRoute` tRPC procedure
- Make routing a `protectedProcedure` instead of `publicProcedure`
- Show UI message when unsigned: "Sign in to calculate routes and costs"
- Display "Route calculation requires sign-in" on map when user is not signed in

**Pros**:

- Simple to implement (1-2 hours)
- Zero cost for unsigned users
- Users still get value from search and planning
- Clear auth requirement

**Cons**:

- Limits trial experience (users can't see distance/cost)
- May reduce sign-up conversion if users can't see the full value
- Users see the feature exists but can't use it

**Cost Impact**: ~95% reduction for unsigned traffic

**Implementation Effort**: Low (1-2 hours)

---

### **Option 3: Use a Free/Cheaper Alternative API for Unsigned Users**

**Approach**: Route unsigned users through OpenRouteService or similar free routing API; use Mapbox only for signed-in users.

**Implementation**:

- Create wrapper function in `routing.ts` that detects if user is signed in
- Route to OpenRouteService (free, no API key needed) for unsigned users
- Route to Mapbox for signed-in users
- Clearly disclose: "Results shown with OpenRouteService for demo"

**Pros**:

- Minimal cost (~$0 for unsigned)
- Users see full functionality
- Better trial experience

**Cons**:

- Different routing quality between services
- Adds complexity (maintain 2 routing engines)
- OpenRouteService may have rate limits
- Potential legal/disclosure issues with different services

**Cost Impact**: Near zero for unsigned users

**Implementation Effort**: High (4-5 hours, testing complexity)

---

### **Option 4: Client-Side Distance Calculation for Unsigned Users**

**Approach**: For unsigned users, calculate Haversine distance client-side instead of using Mapbox; only show actual routing for signed-in users.

**Implementation**:

- Keep Mapbox geometry but calculate distance locally
- Show simple straight-line distance for unsigned users
- Sign-in to get actual routed distance (more accurate)
- Mark client-side results: "Approximate distance (sign in for accurate routing)"

**Pros**:

- Zero cost for unsigned users
- Very simple implementation (30 mins)
- Users see immediate value
- Transparent about limitations

**Cons**:

- Client-side distance significantly less accurate than routed distance
- May disappoint users when they see accuracy difference

**Cost Impact**: Near zero for unsigned users

**Implementation Effort**: Very Low (30 mins - 1 hour)

---

### **Option 5: Time-Based Trial (Like SaaS Products)**

**Approach**: Allow unsigned users full access to the app for a limited time period (e.g., 24 hours or 1 week).

**Implementation**:

- Use localStorage to track first visit + trial expiration
- Allow unlimited Mapbox calls during trial period
- After expiration, redirect to sign-in page
- Show countdown timer when trial is near end

**Pros**:

- Best user experience during trial
- Users discover full value
- Standard SaaS pattern (familiar to users)
- Can track conversion rate per trial length

**Cons**:

- Costs predictable but higher (all free users hit all APIs)
- Requires cleanup of localStorage tracking
- Potential for abuse (clearing storage to reset trial)

**Cost Impact**: Depends on trial length (7-day trial = 7x cost per user)

**Implementation Effort**: Medium (2-3 hours)

---

## Hybrid Recommendation: **Option 1 + Option 2**

**Best balanced approach**:

1. **For Unsigned Users**:

   - Full search/place autocomplete (free with session tokens)
   - 3-5 free route calculations per day
   - After quota: "Unlimited routing with free sign-up"

2. **For Signed-In Users**:
   - Unlimited routing
   - Saved routes
   - Cost history/savings

**Why this works**:

- Users can fully evaluate the product
- Clear upgrade trigger
- Low implementation complexity
- ~60-70% cost savings
- High conversion signal (user hit the limit = engaged)

---

## Implementation Steps

### Phase 1: Route Calculation Auth Check (Immediate - 1 hour)

Make routing a `protectedProcedure` to eliminate unsigned user costs while you plan the quota system.

### Phase 2: Add Request Quota System (Week 1 - 2-3 hours)

Implement Redis/in-memory quota tracking for unsigned users.

### Phase 3: UI/UX Messaging (Week 1 - 1-2 hours)

Add helpful messages and prompts when unsigned users hit limits.

---

## Monitoring & Metrics

Add tracking for:

```typescript
// In your tRPC routes
console.log({
  event: 'route_calculation',
  userId: ctx.userId ? 'authenticated' : 'anonymous',
  timestamp: new Date(),
  waypoints: waypoints.length,
});
```

Track in your Mapbox dashboard:

- Current spend/month
- API calls by endpoint
- Cost per route calculation

---

## Budget Scenarios

**Current (No Restrictions)**:

- ~$0.50-$2.00 per 1,000 route calculations
- 100 daily active unsigned users × 5 routes = $75-300/month

**With Option 1 (5 free routes/user)**:

- Reduced to ~$25-50/month unsigned traffic
- Signed-in users convert to paying product
- Typical SaaS conversion: 2-5% = 1-5 paying customers

**With Option 2 (Route calculations require sign-in)**:

- ~$0-5/month unsigned costs
- May reduce conversions without demo experience

**Recommendation**: Start with Option 2 (disable unsigned routing) → pivot to Option 1 if conversion is too low.
