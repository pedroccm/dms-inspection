#!/bin/bash
# Run E2E tests on all devices sequentially with cleanup between each
DB_URL="postgresql://postgres:%23Matheus310785%23@db.lbfkkteoiieraggbxgfc.supabase.co:5432/postgres"

cleanup() {
  npx supabase db query --db-url "$DB_URL" "DELETE FROM checklist_items WHERE inspection_id IN (SELECT id FROM inspections);" 2>/dev/null
  npx supabase db query --db-url "$DB_URL" "DELETE FROM form_locks;" 2>/dev/null
  npx supabase db query --db-url "$DB_URL" "DELETE FROM inspections;" 2>/dev/null
}

echo "=== Desktop ==="
cleanup
npx playwright test --project=desktop --timeout 180000
DESKTOP=$?

echo ""
echo "=== Tablet ==="
cleanup
npx playwright test --project=tablet --timeout 180000
TABLET=$?

echo ""
echo "=== Mobile ==="
cleanup
npx playwright test --project=mobile --timeout 180000
MOBILE=$?

echo ""
echo "========================"
echo "Desktop: $([ $DESKTOP -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "Tablet:  $([ $TABLET -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "Mobile:  $([ $MOBILE -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "========================"
