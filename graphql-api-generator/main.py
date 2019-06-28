#!/usr/bin/env python3
import generator

files = ['../graphql-schema/SpiritContentDB_DB_Schema_DetectionResults.graphql',
         '../graphql-schema/SpiritContentDB_DB_Schema_Directives.graphql',
         '../graphql-schema/SpiritContentDB_DB_Schema_Investigations.graphql',
         '../graphql-schema/SpiritContentDB_DB_Schema_Jobs.graphql',
         '../graphql-schema/SpiritContentDB_DB_Schema_ScalarTypes.graphql',
         '../graphql-schema/SpiritContentDB_DB_Schema_SearchResults.graphql',
         '../graphql-schema/SpiritContentDB_DB_Schema_SocialGraph.graphql']
files = ['./resources/schema.graphql']
generator.run(','.join(files), None, True, './resources/config.cfg')
#generator.run(','.join(files), './resources/api-schema.graphql', True)