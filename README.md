# Eaton's Import Scripts

A giant pile of import/migration/data scrubbing code to pull things from various blogs, backups, APIs, and folders full of text files and jam them into my personal (schema.org-inspired) archive.

# The Shape of Things

Generally speaking each import is a self-contained class that can accept *input* data, create intermediary *cache* data, and ultimately produce *output* data. Depending on the import, 'input' might mean:

* Concrete data ala Twitter archive files, a sqlite DB, or a folder full of XML
* A 'hit list' of stuff to retrieve from a remote api or service
* Who knows

The 'cache' stage exists so that remote services accessed due to a hit list, etc only need be accessed once. The "rawest" form of the data retrieved from them should be stored, and the next stage — actual importing — 