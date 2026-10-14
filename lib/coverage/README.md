# Balconia delivery and installation coverage

Product delivery: whole NCT Delhi plus the 24 constituent districts listed by NCRPB at https://ncrpb.nic.in/ncrconstituent.html (checked 11 October 2026). The configured state/district list and documented spelling aliases live in config.json under deliveryTerritory.regions. This is administrative coverage, not a guessed PIN-prefix list or radius.

PIN checks call Esri postal geocoding and are preliminary. Exact checkout coverage always uses a high-confidence precise address match, matching PIN, country and state; its provider-returned district must belong to deliveryTerritory.regions. Broad city/Postal centroids cannot validate a delivery address. Map-only checks use independent reverse geocoding and verify matching postal code and distance to the returned point. Client flags and district labels are never trusted.

Makeover installation remains independently limited to 15 km straight-line distance from the existing verified Wellington Estate hub AND the existing Gurgaon municipal footprint (gurugram-city.json). Product eligibility never grants installation eligibility.

Browsing is open worldwide. The initial popup is dismissible, including on unsupported PINs or provider failures. Adding products to a bag is allowed without a PIN. Orders and consultation requests verify coverage server-side before database writes. No provider failure is treated as successful verification.

## Administration

Change deliveryTerritory.regions and bump config.version after verifying added districts/aliases against official notifications and map-provider results. Redeploy the configuration. No frontend lists need changes. Existing config.pins is historical Gurgaon reference data, not the NCR delivery eligibility source. PIN results are cached server-side for 15 minutes (maximum 500 entries); exact address search is cached 10 minutes (maximum 100 entries). Clear/new deployment refreshes these process caches.

The NCRPB page describes the notified region and explicitly says its updated map is not yet prepared. This implementation uses provider-returned district/state fields, not a fabricated NCR polygon. New or renamed districts absent from the verified configuration fail verification until reviewed. Confirm provider administrative labels and add official parent-district mappings before covering such addresses.

## Provider and installation limits

ARCGIS_GEOCODING_API_KEY is optional for the existing endpoint and must stay in server environment secrets. Use an appropriately licensed geocoding account for production traffic/storage. Failure, missing administrative fields, low-confidence matches, mismatched PIN/state and ambiguous addresses reject orders with helpful errors.

Hub source remains in hub-geocoding-source.json. Gurgaon installation geometry is the existing dated 2024 ward snapshot from https://data.opencity.in/dataset/gurugram-wards-map. Replace with verified current municipal geometry when updating installation coverage. It is not a new NCR delivery polygon.
