**v0.1.4, to be released on ???**

**v0.1.3, released on August 28, 2020**
* New feature: Support for multiple *dependent* mutation operations within a single mutation request; https://github.com/LiUGraphQL/woo.sh/issues/52
* Bug fix: Corrected an issue when trying to delete non-existing objects/edges.
* Bug fix: small bug fix in addPossibleTypes for queries; see: https://github.com/LiUGraphQL/woo.sh/commit/514a8e01acceab355a0e4729b1b1a6de2a6ee2df

**v0.1.2, released on August 19, 2020**
* New feature: Changed Edge validation behaviour to not check for existance of documents created in the same mutation. See: https://github.com/LiUGraphQL/woo.sh/pull/98
* New feature: Individual edges can now by queried by ID
* New feature: Edge (annotations) can now be updated. See: https://github.com/LiUGraphQL/woo.sh/issues/35
* New feature: Edges can now be deleted. See: https://github.com/LiUGraphQL/woo.sh/issues/36
* New feature: Objects can now be deleted. See: https://github.com/LiUGraphQL/woo.sh/issues/82
* New feature: Incomming/outgoing edges can now be filtered. See: https://github.com/LiUGraphQL/woo.sh/issues/32
* Bug fix: Checks for existence of the database before attempting to drop it. See: https://github.com/LiUGraphQL/woo.sh/issues/89
* Bug fix: Changed how incomming/outgoing edges behavies for types implementing interfaces. See: https://github.com/LiUGraphQL/woo.sh/pull/85
* Bug fix: If edge annotations are required, the annotation object is nor correctly marked as required for creation.

**v0.1.1, released on June 23, 2020**
* New feature: Edge annotations can now be set when creating and/or updating objects. See: https://github.com/LiUGraphQL/woo.sh/issues/24
* New feature: Incoming and outgoing edges (with annotations) can now be queried (not just the sources and targets). See: https://github.com/LiUGraphQL/woo.sh/issues/31
* New feature: client-tests now handles edge annotations.
* Bug fix: Default values missing from field arguments is now fixed.
* Bug fix: Filters occuring in subfields nolonger causes errors.

**v0.1.0, released on June 09, 2020**
* Initial version
