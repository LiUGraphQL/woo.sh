**v0.1.2, to be released on ???**
* Bug fix: Checks for existence of the database before attempting to drop it. See: https://github.com/LiUGraphQL/woo.sh/issues/89
* New feature: Individual edges can now by queried by ID
* New feature: Edge (annotations) can now be updated. See: https://github.com/LiUGraphQL/woo.sh/issues/35
* New feature: Edges can now be deleted. See: https://github.com/LiUGraphQL/woo.sh/issues/36
* New feature: Objects can now be deleted. See: https://github.com/LiUGraphQL/woo.sh/issues/82
* New feature: Incomming/outgoing edges can now be filtered. See: https://github.com/LiUGraphQL/woo.sh/issues/32
* Bug fix: Changed how incomming/outgoing edges behavies for types implementing interfaces. See: https://github.com/LiUGraphQL/woo.sh/pull/85

**v0.1.1, released on June 23, 2020**
* New feature: Edge annotations can now be set when creating and/or updating objects. See: https://github.com/LiUGraphQL/woo.sh/issues/24
* New feature: Incoming and outgoing edges (with annotations) can now be queried (not just the sources and targets). See: https://github.com/LiUGraphQL/woo.sh/issues/31
* New feature: client-tests now handles edge annotations.
* Bug fix: Default values missing from field arguments is now fixed.
* Bug fix: Filters occuring in subfields nolonger causes errors.

**v0.1.0, released on June 09, 2020**
* Initial version
