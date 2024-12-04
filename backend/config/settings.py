from dynaconf import Dynaconf

settings = Dynaconf(
    environments=True,
    envvar_prefix="APP",
    settings_files=['settings.yaml', '.secrets.yaml']
) 