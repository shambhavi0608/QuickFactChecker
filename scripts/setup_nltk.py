import nltk
import ssl

def setup_nltk_resources():
    """
    Downloads required NLTK resources, handling potential SSL and download errors.
    """

    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        pass
    else:
        ssl._create_default_https_context = _create_unverified_https_context

    resource_paths = {
        "punkt": "tokenizers/punkt",
        "stopwords": "corpora/stopwords",
        "wordnet": "corpora/wordnet",
        "omw-1.4": "corpora/omw-1.4",
    }

    print("🚀 Starting NLTK resource setup...\n")

    for package, path in resource_paths.items():
        print(f"Processing: {package}")

        try:
            nltk.data.find(path)
            print(f"  ✅ {package} is already installed.")
        except LookupError:
            try:
                print(f"  ⬇️ Downloading {package}...")
                nltk.download(package, quiet=False) 
                print(f"  ✅ Successfully downloaded: {package}")
            except Exception as e:
                print(f"--- 🛑 ERROR downloading {package} ---")
                print("  -> Check your network connection or run with administrator permissions.")
                print(f"  -> Details: {type(e).__name__}: {e}")
        except Exception as e:
            print(f"⚠️ Unexpected error while checking {package}: {e}")

        print()

    print("🎉 NLTK resource setup complete.")
    print("If you still encounter 'LookupError', ensure NLTK is installed correctly and your Python environment is active.")

if __name__ == "__main__":
    setup_nltk_resources()
