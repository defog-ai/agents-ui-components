# OracleEmbed Performance Optimization TODO

## Key Improvements to Make OracleEmbed Snappier

1. ✅ **Memoization & Optimized Renders** (Completed)
   - ✅ Added React.memo to pure components
   - ✅ Implemented useCallback/useMemo for event handlers and derived values
   - ✅ Fixed excessive re-renders from state changes in parent components

2. **Data Fetching Optimization**
   - Implement pagination for history items instead of loading all at once
   - Add data caching with React Query configured with appropriate staleTime
   - Move to server-side filtering for history/projects instead of client-side filtering

3. **Context Optimization**
   - Split OracleEmbedContext into smaller contexts based on update frequency
   - Move rapidly-changing state out of contexts that feed into large component trees

4. **List Virtualization**
   - Implement windowing for history sidebar with react-window/react-virtualized
   - Only render visible items in large lists, especially in OracleHistorySidebar

5. **Code Splitting**
   - Lazy load less frequently used components with React.lazy
   - Split the query-data and reports functionality to load conditionally

6. **WebSocket Optimization**
   - Implement message batching for frequent updates
   - Add reconnection backoff strategy

7. **Debouncing Inputs**
   - Add debounce to search inputs and filters
   - Throttle expensive calculations and DOM updates