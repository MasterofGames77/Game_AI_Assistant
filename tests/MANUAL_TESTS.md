# Manual Testing Checklist

## Splash Page to Assistant Flow

1. [ ] Sign up on splash page with new email
2. [ ] Verify user is created in splash page database
3. [ ] Approve user in splash page admin
4. [ ] Click assistant link from splash page
5. [ ] Verify user data appears in assistant database
6. [ ] Verify Pro access status is correct

## User Synchronization

1. [ ] Check existing user in splash page database
2. [ ] Run sync script
3. [ ] Verify user appears in assistant database
4. [ ] Verify all fields are correctly copied
5. [ ] Verify achievements and progress are initialized

## Error Handling

1. [ ] Test with invalid user ID
2. [ ] Test with non-existent email
3. [ ] Test with disconnected database
4. [ ] Verify error messages are logged
5. [ ] Verify graceful failure handling

## Pro Access

1. [ ] Verify Pro access transfers from splash page
2. [ ] Test Pro access update propagation
3. [ ] Verify Pro features are accessible
