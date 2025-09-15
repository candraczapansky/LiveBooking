#!/usr/bin/env python3

# Save the Helcim CSV data
csv_data = """ORDER_NUMBER	BATCH_NUMBER	CUSTOMER_CODE	CUSTOMER_NAME	SOURCE	CARD	TRANSACTION_TYPE	APPROVAL_CODE	DATE_CREATED	AMOUNT	AMOUNT_TIP	CURRENCY	USER	STATUS
POS-1757440675881	25	CST1625	WOLFE ALEXIS	CARD	Visa	Purchase	105823	09/09/25	$77.00	$12.00	USD	candra czapansky	APPROVED
POS-1757620904340	27	CST1779		CARD	Visa	Purchase	342270	11/09/25	$15.00	$0.00	USD	candra czapansky	APPROVED
INV001102	26	CST1662	jennifer kraszewski	CARD	Amex	Purchase	283508	10/09/25	$55.00	$0.00	USD	Helcim System	APPROVED
POS-1757789902428	29	CST1892		CARD	Discover	Purchase	01331R	13/09/25	$69.00	$9.00	USD	candra czapansky	APPROVED
APT-388-1755359088830	7	CST1061		CARD	Visa	Purchase	107622	16/08/25	$2.00	$0.00	USD	candra czapansky	APPROVED
"""

# Just saving a sample for testing - you'll need to paste the full data
with open('data/helcim-transactions.csv', 'w') as f:
    f.write(csv_data)
    
print("✅ Sample CSV data saved to data/helcim-transactions.csv")










